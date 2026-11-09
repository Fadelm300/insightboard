import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import ts from 'typescript';

function load(file, deps = {}) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const exports = {};
  const code = ts.transpileModule(
    source,
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    Buffer,
    Date,
    Object,
    JSON,
    require(name) {
      if (!(name in deps)) throw new Error(`Unexpected dependency ${name}`);
      return deps[name];
    }
  });
  return exports;
}
const permissions = load('lib/permissions.ts');
const policy = load('lib/archiveApprovalPolicy.ts', { '@/lib/permissions': permissions });
const adminId = 'a'.repeat(24),
  managerId = 'b'.repeat(24),
  requesterId = 'c'.repeat(24),
  otherId = 'd'.repeat(24),
  recordId = 'e'.repeat(24);

function fixture({ resource = 'clients', blocked = false, auditFailure = false } = {}) {
  let state = {
    users: {
      [adminId]: { _id: adminId, role: 'admin' },
      [managerId]: { _id: managerId, role: 'manager' },
      [otherId]: { _id: otherId, role: 'manager' },
      [requesterId]: {
        _id: requesterId,
        role: 'senior',
        managedBy: managerId,
        isActive: true,
        allowedPermissions: ['archiveRequests.read', 'archiveRequests.create', ...policy.ARCHIVE_RESOURCES.map((name) => `${name}.read`)]
      },
    },
    records: {
      [recordId]: {
        _id: recordId,
        companyName: 'Synthetic client',
        name: 'Synthetic project',
        title: 'Synthetic record',
        updatedAt: new Date('2026-11-09T10:00:00Z'),
        amount: 25,
        isDeleted: false
      }
    },
    requests: {},
    events: [],
    archiveEvents: [],
  };
  const session = {};
  let queue = Promise.resolve(), active = false;
  function query(value) {
    return {
      select() {
        return this;
      },
      session(value) {
        assert.equal(value, session);
        return this;
      },
      lean: async () => value,
      then(resolve, reject) {
        return Promise.resolve(value).then(resolve, reject);
      }
    };
  }
  const model = {
    findOne(filter) {
      const value = state.records[filter._id];
      return query(value && !value.isDeleted ? structuredClone(value) : null);
    }
  };
  function matches(value, filter) {
    return Object.entries(filter).every(([key, expected]) => {
      if (key === '$or') return expected.some((part) => matches(value, part));
      if (expected && typeof expected === 'object' && '$in' in expected)
        return expected.$in.includes(value[key]);
      return String(value[key]) === String(expected);
    });
  }
  const requestModel = {
    findOne(filter) {
      return query(Object.values(state.requests).find((value) => matches(value, filter)) ?? null);
    },
    findById(id) {
      return query(state.requests[id] ?? null);
    },
    async create([value], options) {
      assert.equal(options.session, session);
      const id = (Object.keys(state.requests).length + 1).toString(16).padStart(24, '0');
      const result = { ...value, _id: id, createdAt: new Date() };
      state.requests[id] = result;
      return [{ ...result, toObject: () => result }];
    },
    async updateOne(filter, update, options) {
      assert.equal(options.session, session);
      const value = state.requests[filter._id];
      if (!value || !matches(value, filter)) return { matchedCount: 0 };
      Object.assign(value, update.$set);
      return { matchedCount: 1 };
    },
    find(filter) {
      let rows = Object.values(state.requests).filter((value) => matches(value, filter));
      return {
        sort() {
          return this;
        },
        skip(count) {
          rows = rows.slice(count);
          return this;
        },
        limit(count) {
          rows = rows.slice(0, count);
          return this;
        },
        lean: async () => rows
      };
    },
  };
  const deps = {
    'node:crypto': { createHash },
    '@/lib/permissions': permissions,
    '@/lib/archiveApprovalPolicy': policy,
    '@/models/User': {
      default: {
        findOneAndUpdate(filter, update, options) {
          assert.equal(options.session, session);
          assert.equal(options.timestamps, false);
          return query(state.users[filter._id] ?? null);
        },
        findById(id) {
          return query(state.users[id] ?? null);
        },
        find(filter) {
          return query(Object.values(state.users).filter((user) => filter._id.$in.includes(user._id)));
        },
      }
    },
    '@/models/ArchiveRequest': { default: requestModel },
    '@/models/ArchiveRequestEvent': {
      default: {
        async create(values, options) {
          assert.equal(options.session, session);
          if (auditFailure && values[0].action === 'approved') throw new Error('audit failed');
          state.events.push(...structuredClone(values));
        }
      }
    },
    '@/lib/crmWriteTransaction': {
      withCrmWriteTransaction(operation) {
        const pending = queue.then(async () => {
          const before = structuredClone(state);
          active = true;
          try {
            return await operation(session);
          } catch (error) {
            state = before;
            throw error;
          } finally {
            active = false;
          }
        });
        queue = pending.catch(() => { });
        return pending;
      }
    },
    '@/lib/crmArchive': {
      archiveCrmRecord: async (type, id, actor) => {
        assert.equal(active, true);
        assert.equal(type, resource);
        assert.equal(id, recordId);
        assert.notEqual(actor, requesterId);
        if (blocked) return 'active-dependants';
        state.records[id].isDeleted = true;
        state.archiveEvents.push({ type, id, actor });
        return 'archived';
      }
    },
    '@/lib/financialArchive': {
      changeFinancialArchive: async (type, id, actor, action) => {
        assert.equal(active, true);
        assert.equal(action, 'archive');
        assert.equal(type, resource);
        state.records[id].isDeleted = true;
        state.archiveEvents.push({ type, id, actor });
        return 'changed';
      }
    },
  };
  for (const name of ['Client', 'Deal', 'Project', 'Revenue', 'Expense']) deps[`@/models/${name}`] = { default: model };
  const service = load('lib/archiveApproval.ts', deps);
  return {
    service,
    state: () => state,
    create: () => service.requestArchive(requesterId, resource, recordId, 'Synthetic review reason'),
    decide: (id, action = 'approve', actor = managerId) => service.decideArchiveRequest(actor, id, action, 'Reviewed synthetic request')
  };
}

test('archive request permissions cannot turn an employee or viewer into a reviewer', () => {
  assert.equal(permissions.permissionCeiling('employee').includes('archiveRequests.review'), false);
  assert.equal(permissions.permissionCeiling('senior').includes('clients.delete'), false);
  assert.equal(permissions.permissionCeiling('viewer').includes('archiveRequests.create'), false);
  assert.equal(
    permissions.hasPermission(
      { role: 'employee', allowedPermissions: ['archiveRequests.create'] },
      'archiveRequests.create'
    ),
    false
  );
  assert.equal(policy.isArchiveResource('__proto__'), false);
  for (const reason of ['', '1234', '<script>x</script>', 'a'.repeat(501), { '$ne': '' }]) assert.equal(policy.validateApprovalReason(reason), null);
  assert.equal(policy.validateApprovalReason('  Valid reason  '), 'Valid reason');
});

for (const resource of policy.ARCHIVE_RESOURCES) {
  test(`${resource}: requesting preserves the active record; another reviewer archives atomically`, async () => {
    const f = fixture({ resource });
    const request = await f.create();
    assert.equal(f.state().records[recordId].isDeleted, false);
    assert.equal(request.status, 'pending');
    assert.equal('recordVersion' in request, false);
    assert.equal('amount' in request, false);
    assert.equal(f.state().events.length, 1);
    const result = await f.decide(request.id);
    assert.equal(result.status, 'approved');
    assert.equal(f.state().records[recordId].isDeleted, true);
    assert.equal(f.state().archiveEvents.length, 1);
    assert.equal(f.state().events.at(-1).action, 'approved');
    await assert.rejects(f.decide(request.id), (error) => error.status === 409);
    assert.equal(f.state().archiveEvents.length, 1);
  });
}

test('duplicate requests are rejected without creating a second event', async () => {
  const f = fixture();
  await f.create();
  await assert.rejects(f.create(), (error) => error.status === 409);
  assert.equal(f.state().events.length, 1);
});
test('self approval, another manager and forged grants fail before archiving', async () => {
  const f = fixture();
  const request = await f.create();
  await assert.rejects(f.decide(request.id, 'approve', requesterId), (error) => error.status === 403);
  await assert.rejects(f.decide(request.id, 'approve', otherId), (error) => error.status === 403);
  f.state().users[requesterId].allowedPermissions.push('archiveRequests.review', 'clients.delete');
  await assert.rejects(f.decide(request.id, 'approve', requesterId), (error) => error.status === 403);
  assert.equal(f.state().archiveEvents.length, 0);
});
test('record changes, revoked requester grants and team reassignment block approval', async () => {
  for (const change of [
    (state) => {
      state.records[recordId].amount++;
    },
    (state) => {
      state.users[requesterId].allowedPermissions = ['archiveRequests.read', 'clients.read'];
    },
    (state) => {
      state.users[requesterId].managedBy = otherId;
    },
    (state) => {
      state.users[managerId].isActive = false;
    },
    (state) => {
      state.users[requesterId].isActive = false;
    },
    (state) => {
      state.users[managerId].allowedPermissions = ['archiveRequests.read', 'archiveRequests.review', 'clients.read'];
    },
  ]) {
    const f = fixture();
    const request = await f.create();
    change(f.state());
    await assert.rejects(f.decide(request.id), (error) => [403, 409].includes(error.status));
    assert.equal(f.state().records[recordId].isDeleted, false);
  }
});
test('blocked relationships and approval audit failures roll back record and request state', async () => {
  for (const options of [{ blocked: true }, { auditFailure: true }]) {
    const f = fixture(options);
    const request = await f.create();
    await assert.rejects(f.decide(request.id));
    assert.equal(f.state().records[recordId].isDeleted, false);
    assert.equal(f.state().requests[request.id].status, 'pending');
    assert.equal(f.state().archiveEvents.length, 0);
    assert.equal(f.state().events.length, 1);
  }
});
test('concurrent review attempts commit one archive and one decision event', async () => {
  const f = fixture();
  const request = await f.create();
  const results = await Promise.allSettled([f.decide(request.id), f.decide(request.id, 'approve', adminId)]);
  assert.equal(results.filter((value) => value.status === 'fulfilled').length, 1);
  assert.equal(f.state().archiveEvents.length, 1);
  assert.equal(f.state().events.filter((event) => event.action === 'approved').length, 1);
});
test('rejection, requester cancellation and expiry never archive the record', async () => {
  for (const action of ['reject', 'cancel', 'expired']) {
    const f = fixture();
    const request = await f.create();
    if (action === 'expired') f.state().requests[request.id].expiresAt = new Date(0);
    const result = await f.decide(
      request.id,
      action === 'expired' ? 'approve' : action,
      action === 'cancel' ? requesterId : managerId
    );
    assert.equal(
      result.status,
      action === 'reject' ? 'rejected' : action === 'cancel' ? 'cancelled' : 'expired'
    );
    assert.equal(f.state().records[recordId].isDeleted, false);
  }
});
test('list boundaries show own requests or assigned team requests with safe fields', async () => {
  const f = fixture();
  await f.create();
  assert.equal((await f.service.listArchiveRequests(requesterId, 1)).records.length, 1);
  assert.equal((await f.service.listArchiveRequests(managerId, 1)).records.length, 1);
  assert.equal((await f.service.listArchiveRequests(otherId, 1)).records.length, 0);
  const rows = (await f.service.listArchiveRequests(adminId, 1)).records;
  assert.equal(rows.length, 1);
  assert.equal('recordVersion' in rows[0], false);
  assert.equal('allowedPermissions' in rows[0], false);
});

const http = load('lib/archiveApprovalHttp.ts');
test('bounded request parser rejects malformed, oversized and non-object bodies', async () => {
  for (const text of ['{', '[]', 'null', JSON.stringify({ reason: 'a'.repeat(5000) })]) {
    const req = new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text });
    assert.equal(await http.readApprovalBody(req), null);
  }
});

function routeFixture({ denied = false, demo = false, failure } = {}) {
  const calls = { database: 0, writes: 0 };
  class SafeError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  }
  const deps = {
    '@/lib/authorization': {
      authorizeRequest: async () => denied
        ? { user: null, response: Response.json({ message: 'Forbidden' }, { status: 403 }) }
        : { user: { id: managerId }, response: null }
    },
    '@/lib/apiResponse': {
      errorResponse: (message, status) => Response.json({ success: false, message }, { status }),
      successResponse: (data, message = 'Success', status = 200) => Response.json({ success: true, message, data }, { status })
    },
    '@/lib/demoMode': { blockIfDemoMode: () => demo ? Response.json({}, { status: 403 }) : null },
    '@/lib/mongodb': {
      default: async () => {
        calls.database++;
      }
    },
    '@/lib/archiveApprovalPolicy': policy,
    '@/lib/archiveApprovalHttp': http,
    '@/lib/archiveApproval': {
      ArchiveApprovalError: SafeError,
      requestArchive: async () => {
        calls.writes++;
        if (failure) throw failure;
        return { status: 'pending' };
      },
      decideArchiveRequest: async () => {
        calls.writes++;
        if (failure) throw failure;
        return { status: 'approved' };
      },
      listArchiveRequests: async () => ({ records: [], hasMore: false }),
    },
  };
  return {
    calls,
    create: load('app/api/archive-requests/route.ts', deps),
    decision: load('app/api/archive-requests/[id]/decision/route.ts', deps)
  };
}
function jsonRequest(value) {
  return new Request('http://localhost/api/archive-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  });
}
test('approval routes deny permission and demo mutations before database access', async () => {
  for (const options of [{ denied: true }, { demo: true }]) {
    const f = routeFixture(options);
    assert.equal((await f.create.POST(jsonRequest({}))).status, 403);
    assert.equal(
      (await f.decision.POST(jsonRequest({}), { params: Promise.resolve({ id: recordId }) })).status,
      403
    );
    assert.equal(f.calls.database, 0);
    assert.equal(f.calls.writes, 0);
  }
});
test('create rejects unsupported resources, IDs, reasons and injected fields before connecting', async () => {
  const valid = { resource: 'clients', recordId, reason: 'Valid review reason' };
  for (const value of [
    { ...valid, resource: '__proto__' }, { ...valid, recordId: { $ne: null } },
    { ...valid, reason: 'tiny' }, { ...valid, reason: 'x'.repeat(501) },
    { ...valid, requesterId: adminId }, { ...valid, status: 'approved' },
  ]) {
    const f = routeFixture();
    assert.equal((await f.create.POST(jsonRequest(value))).status, 400);
    assert.equal(f.calls.database, 0);
    assert.equal(f.calls.writes, 0);
  }
});
test('decision rejects forged actions and reviewer fields before connecting', async () => {
  for (const value of [{ action: 'delete', reason: 'Valid reason' }, { action: { toString: 'approve' }, reason: 'Valid reason' }, { action: 'approve', reason: 'Valid reason', actorId: adminId }]) {
    const f = routeFixture();
    assert.equal(
      (await f.decision.POST(jsonRequest(value), { params: Promise.resolve({ id: recordId }) })).status,
      400
    );
    assert.equal(f.calls.database, 0);
  }
});
test('list pagination rejects duplicate, excessive and non-integer pages before connecting', async () => {
  for (const search of ['?page=0', '?page=-1', '?page=1001', '?page=1.5', '?page=1&page=2', '?status=pending']) {
    const f = routeFixture();
    assert.equal((await f.create.GET({ nextUrl: new URL(`http://localhost/${search}`) })).status, 400);
    assert.equal(f.calls.database, 0);
  }
});
test('successful route responses preserve pending and approval outcomes; unexpected errors stay generic', async () => {
  const f = routeFixture();
  const response = await f.create.POST(jsonRequest({ resource: 'clients', recordId, reason: 'Valid review reason' }));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).data.request.status, 'pending');
  const decision = await f.decision.POST(
    jsonRequest({ action: 'approve', reason: 'Valid review reason' }),
    { params: Promise.resolve({ id: recordId }) }
  );
  assert.equal(decision.status, 200);
  assert.equal((await decision.json()).data.status, 'approved');
  const broken = routeFixture({ failure: new Error('private database host and credentials') });
  const error = await broken.create.POST(jsonRequest({ resource: 'clients', recordId, reason: 'Valid review reason' }));
  assert.equal(error.status, 500);
  assert.doesNotMatch(await error.text(), /private|credentials|host/);
});

test('a reviewer can reject a disabled requester without executing an archive', async () => {
  const f = fixture();
  const request = await f.create();
  f.state().users[requesterId].isActive = false;
  const result = await f.decide(request.id, 'reject');
  assert.equal(result.status, 'rejected');
  assert.equal(f.state().records[recordId].isDeleted, false);
});
test('request lists show participant names without exposing account contact fields', async () => {
  const f = fixture();
  f.state().users[requesterId].name = 'Requester';
  f.state().users[requesterId].email = 'private@test';
  f.state().users[managerId].name = 'Reviewer';
  const request = await f.create();
  await f.decide(request.id);
  const list = await f.service.listArchiveRequests(managerId, 1);
  assert.equal(list.records[0].requesterName, 'Requester');
  assert.equal(list.records[0].decidedByName, 'Reviewer');
  assert.doesNotMatch(JSON.stringify(list), /private@test|password|allowedPermissions|recordVersion/);
});
