import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(file, deps) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, Date, Object, URL, require(name) {
    if (!(name in deps)) throw Error(`Unexpected dependency: ${name}`);
    return deps[name];
  } });
  return exports;
}
const id = "a".repeat(24), actorId = "b".repeat(24);
const plain = (value) => JSON.parse(JSON.stringify(value));

function fixture({ resource = "clients", dependant, archived = false, missing = false, auditError = false, writeError = false, unmatched = false } = {}) {
  let state = { archived, events: [] };
  const calls = { checks: [], writes: 0, ended: 0 };
  const session = {
    async withTransaction(callback) {
      const before = structuredClone(state);
      try { return await callback(); }
      catch (error) { state = before; throw error; }
    },
    async endSession() { calls.ended++; },
  };
  const models = {};
  for (const name of ["Client", "Deal", "Project", "Revenue", "Expense"]) {
    models[name] = {
      findOne(filter) {
        assert.deepEqual(plain(filter), { _id: id, isDeleted: { $ne: true } });
        return { select: () => ({ session: async (value) => {
          assert.equal(value, session);
          return missing || state.archived ? null : { _id: id };
        } }) };
      },
      exists(filter) { return { session: async (value) => {
        assert.equal(value, session);
        calls.checks.push({ name, filter: plain(filter) });
        return name === dependant ? { _id: "c".repeat(24) } : null;
      } }; },
      async updateOne(filter, update, options) {
        assert.equal(options.session, session);
        assert.deepEqual(plain(filter), { _id: id, isDeleted: { $ne: true } });
        assert.deepEqual(plain(update), { $set: { isDeleted: true } });
        if (writeError) throw Error("private database host");
        if (unmatched) return { matchedCount: 0 };
        calls.writes++;
        state.archived = true;
        return { matchedCount: 1 };
      },
    };
  }
  const deps = { mongoose: { startSession: async () => session } };
  for (const [name, model] of Object.entries(models)) deps[`@/models/${name}`] = model;
  deps["@/models/CrmArchiveEvent"] = {
    async create(events, options) {
      assert.equal(options.session, session);
      if (auditError) throw Error("private audit failure");
      state.events.push(...plain(events));
    },
  };
  const service = load("lib/crmArchive.ts", deps);
  return { run: () => service.archiveCrmRecord(resource, id, actorId), calls, state: () => state };
}

for (const resource of ["clients", "deals", "projects"]) {
  test(`${resource} archives without erasing data and records actor and action in the same transaction`, async () => {
    const f = fixture({ resource });
    assert.equal(await f.run(), "archived");
    assert.equal(f.state().archived, true);
    assert.deepEqual(f.state().events, [{ actorId, recordId: id, resource, action: "archive" }]);
    assert.equal(f.calls.writes, 1);
    assert.equal(f.calls.ended, 1);
    assert.ok(f.calls.checks.every(({ filter }) => filter.isDeleted.$ne === true));
    const relation = resource === "deals" ? "dealId" : resource === "projects" ? "projectId" : "clientId";
    assert.ok(f.calls.checks.every(({ filter }) => filter[relation] === id));
    assert.equal(await f.run(), "missing");
    assert.equal(f.state().events.length, 1, "repeated archive cannot append another event");
  });
}

for (const [resource, dependant] of [
  ["clients", "Deal"], ["clients", "Project"], ["clients", "Revenue"],
  ["deals", "Project"], ["projects", "Revenue"], ["projects", "Expense"],
]) {
  test(`${resource} refuses archiving with an active ${dependant} and writes no event`, async () => {
    const f = fixture({ resource, dependant });
    assert.equal(await f.run(), "active-dependants");
    assert.equal(f.state().archived, false);
    assert.equal(f.calls.writes, 0);
    assert.deepEqual(f.state().events, []);
    assert.equal(f.calls.ended, 1);
  });
}

test("missing records do not query relationships or create audit events", async () => {
  const f = fixture({ missing: true });
  assert.equal(await f.run(), "missing");
  assert.deepEqual(f.calls.checks, []);
  assert.equal(f.calls.writes, 0);
  assert.deepEqual(f.state().events, []);
});

test("audit failure rolls back the archive in the mocked transaction", async () => {
  const f = fixture({ auditError: true });
  await assert.rejects(f.run(), /private audit failure/);
  assert.equal(f.state().archived, false);
  assert.deepEqual(f.state().events, []);
  assert.equal(f.calls.ended, 1);
});

test("write failure and lost state transition create no audit event and end the session", async () => {
  const failed = fixture({ writeError: true });
  await assert.rejects(failed.run());
  assert.deepEqual(failed.state().events, []);
  assert.equal(failed.calls.ended, 1);
  const lost = fixture({ unmatched: true });
  assert.equal(await lost.run(), "missing");
  assert.deepEqual(lost.state().events, []);
});

for (const resource of ["clients", "deals", "projects"]) {
  test(`${resource} DELETE preserves permission and demo gates and maps archive outcomes safely`, async () => {
    let denial = { status: 403 }, demo = null, connected = 0, invoked = 0, outcome = "archived", valid = true;
    const actor = { id: actorId };
    const deps = {
      mongoose: { Types: { ObjectId: { isValid: () => valid } } },
      "@/lib/authorization": { authorizeRequest: async (_req, permission) => {
        assert.equal(permission, `${resource}.delete`);
        return denial ? { response: denial } : { user: actor };
      } },
      "@/lib/demoMode": { blockIfDemoMode: () => demo },
      "@/lib/mongodb": async () => { connected++; },
      "@/lib/apiResponse": { errorResponse: (message, status) => ({ message, status }), successResponse: (data, message) => ({ data, message, status: 200 }) },
      "@/lib/crmArchive": { archiveCrmRecord: async (...args) => {
        invoked++; assert.deepEqual(args, [resource, id, actorId]);
        if (outcome instanceof Error) throw outcome;
        return outcome;
      } },
      "@/lib/crmData": {},
      "@/lib/projectDealLink": { ProjectDealLinkUnavailable: class extends Error {} },
      "@/models/Client": {}, "@/models/Deal": {}, "@/models/Project": {},
    };
    const route = load(`app/api/${resource}/[id]/route.ts`, deps);
    const run = () => route.DELETE({}, { params: Promise.resolve({ id }) });
    assert.equal((await run()).status, 403);
    assert.equal(connected, 0); assert.equal(invoked, 0);
    denial = null; demo = { status: 403 };
    assert.equal((await run()).status, 403);
    assert.equal(connected, 0); assert.equal(invoked, 0);
    demo = null; valid = false;
    assert.equal((await run()).status, 400); assert.equal(invoked, 0);
    valid = true;
    for (const [value, status] of [["archived", 200], ["missing", 404], ["active-dependants", 409], [Error("private database host"), 500]]) {
      outcome = value;
      const response = await run();
      assert.equal(response.status, status);
      assert.equal(JSON.stringify(response).includes("private database host"), false);
    }
  });
}

test("CRM archive audit schema accepts both actions and rejects unknown actions", async () => {
  const { default: mongoose } = await import("mongoose");
  const Model = load("models/CrmArchiveEvent.ts", { mongoose }).default;
  for (const action of ["archive", "restore"]) {
    const event = new Model({ actorId, recordId: id, resource: "projects", action });
    await event.validate();
    assert.ok(event.createdAt instanceof Date);
  }
  await assert.rejects(new Model({ actorId, recordId: id, resource: "projects", action: "purge" }).validate());
});
