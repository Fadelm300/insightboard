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
  vm.runInNewContext(code, { exports, Date, Object, URL, Buffer, Request, require(name) {
    if (!(name in deps)) throw Error(`Unexpected dependency: ${name}`);
    return deps[name];
  } });
  return exports;
}
const id = "a".repeat(24), actorId = "b".repeat(24);
const plain = (value) => JSON.parse(JSON.stringify(value));

function fixture({ resource = "clients", archived = true, dependant, auditError = false, label = "Disposable QA record" } = {}) {
  let state = { exists: true, events: [] };
  const calls = { checks: [], deletes: 0, ended: 0 };
  const session = {
    async withTransaction(callback) {
      const before = structuredClone(state);
      try { return await callback(); }
      catch (error) { state = before; throw error; }
    },
    async endSession() { calls.ended++; },
  };
  const deps = { mongoose: { startSession: async () => session } };
  for (const name of ["Client", "Deal", "Project", "Revenue", "Expense"]) {
    deps[`@/models/${name}`] = {
      findOne(filter) {
        assert.deepEqual(plain(filter), { _id: id, isDeleted: true });
        return { select: () => ({ session: async (value) => {
          assert.equal(value, session);
          return state.exists && archived ? { _id: id, companyName: label } : null;
        } }) };
      },
      exists(filter) { return { session: async (value) => {
        assert.equal(value, session);
        assert.equal("isDeleted" in filter, false, "archived and active dependants must both block deletion");
        calls.checks.push({ name, filter: plain(filter) });
        return name === dependant ? { _id: "c".repeat(24), isDeleted: true } : null;
      } }; },
      async deleteOne(filter, options) {
        assert.equal(options.session, session);
        assert.deepEqual(plain(filter), { _id: id, isDeleted: true });
        if (!state.exists) return { deletedCount: 0 };
        state.exists = false; calls.deletes++;
        return { deletedCount: 1 };
      },
    };
  }
  deps["@/models/CrmDeletionEvent"] = { async create(events, options) {
    assert.equal(options.session, session);
    if (auditError) throw Error("private audit failure");
    state.events.push(...plain(events));
  } };
  const service = load("lib/crmPermanentDelete.ts", deps);
  return {
    run: (confirmation = label || id) => service.permanentlyDeleteCrmRecord(resource, id, actorId, confirmation),
    calls, state: () => state,
  };
}

for (const resource of ["clients", "deals", "projects"]) {
  test(`${resource} permanent deletion requires an archived record and a matching name`, async () => {
    const active = fixture({ resource, archived: false });
    assert.equal(await active.run(), "missing");
    assert.equal(active.calls.deletes, 0);
    const f = fixture({ resource });
    assert.equal(await f.run("wrong name"), "confirmation-mismatch");
    assert.equal(f.calls.deletes, 0);
    assert.equal(await f.run(), "deleted");
    assert.equal(f.state().exists, false);
    assert.deepEqual(f.state().events, [{ actorId, recordId: id, resource, action: "permanent-delete" }]);
    assert.equal(JSON.stringify(f.state().events).includes("Disposable QA record"), false);
    assert.equal(await f.run(), "missing");
    assert.equal(f.state().events.length, 1);
    assert.equal(f.calls.ended, 3);
  });
}

for (const [resource, dependant] of [
  ["clients", "Deal"], ["clients", "Project"], ["clients", "Revenue"],
  ["deals", "Project"], ["projects", "Revenue"], ["projects", "Expense"],
]) {
  test(`${resource} cannot be permanently deleted with even an archived ${dependant}`, async () => {
    const f = fixture({ resource, dependant });
    assert.equal(await f.run(), "has-dependants");
    assert.equal(f.calls.deletes, 0);
    assert.equal(f.state().exists, true);
    assert.deepEqual(f.state().events, []);
  });
}

test("permanent-delete audit failure restores the record in the mocked transaction", async () => {
  const f = fixture({ auditError: true });
  await assert.rejects(f.run(), /private audit failure/);
  assert.equal(f.state().exists, true);
  assert.deepEqual(f.state().events, []);
  assert.equal(f.calls.ended, 1);
});

test("unnamed archived records require their reference ID", async () => {
  const f = fixture({ label: "" });
  assert.equal(await f.run("Unnamed record"), "confirmation-mismatch");
  assert.equal(await f.run(id), "deleted");
});

function routeFixture() {
  let denied = true, demo = false, result = "deleted", connected = 0, called = 0;
  const route = load("app/api/crm-archive/[resource]/[id]/route.ts", {
    "@/lib/authorization": { authorizeRequest: async (_req, permission) => {
      assert.equal(permission, "crmArchive.purge");
      return denied ? { response: { status: 403 } } : { user: { id: actorId } };
    } },
    "@/lib/demoMode": { blockIfDemoMode: () => demo ? { status: 403 } : null },
    "@/lib/mongodb": async () => { connected++; },
    "@/lib/crmArchive": { isCrmArchiveResource: (value) => ["clients", "deals", "projects"].includes(value) },
    "@/lib/crmPermanentDelete": { permanentlyDeleteCrmRecord: async (...args) => {
      called++; assert.deepEqual(args, ["clients", id, actorId, "Disposable QA record"]);
      if (result instanceof Error) throw result;
      return result;
    } },
    "@/lib/apiResponse": { errorResponse: (message, status) => ({ message, status }), successResponse: (data, message) => ({ data, message, status: 200 }) },
  });
  return {
    allow() { denied = false; }, demo() { demo = true; },
    result(value) { result = value; }, stats: () => ({ connected, called }),
    run(body, params = { resource: "clients", id }, contentType = "application/json") {
      return route.DELETE(new Request("http://localhost:3000/api/test", {
        method: "DELETE", headers: { "content-type": contentType }, body,
      }), { params: Promise.resolve(params) });
    },
  };
}
const body = JSON.stringify({ confirmation: "Disposable QA record" });

test("permanent-delete endpoint denies unauthorized and demo requests before database access", async () => {
  const f = routeFixture();
  assert.equal((await f.run(body)).status, 403);
  assert.deepEqual(f.stats(), { connected: 0, called: 0 });
  f.allow(); f.demo();
  assert.equal((await f.run(body)).status, 403);
  assert.deepEqual(f.stats(), { connected: 0, called: 0 });
});

test("permanent-delete endpoint rejects malformed, oversized, injected and unsupported requests before connecting", async () => {
  const f = routeFixture(); f.allow();
  for (const invalid of ["{", "[]", "null", "{}", JSON.stringify({ confirmation: { $ne: "" } }), JSON.stringify({ confirmation: "x", extra: true }), JSON.stringify({ confirmation: "x".repeat(121) }), " ".repeat(1025) + body]) {
    assert.equal((await f.run(invalid)).status, 400);
  }
  assert.equal((await f.run(body, { resource: "revenue", id })).status, 404);
  assert.equal((await f.run(body, { resource: "clients", id: "invalid" })).status, 400);
  assert.equal((await f.run(body, undefined, "text/plain")).status, 400);
  assert.deepEqual(f.stats(), { connected: 0, called: 0 });
});

test("permanent-delete endpoint returns safe conflict, confirmation, missing, success and failure responses", async () => {
  const f = routeFixture(); f.allow();
  for (const [value, status] of [["deleted", 200], ["missing", 404], ["confirmation-mismatch", 400], ["has-dependants", 409], [Error("private database host"), 500]]) {
    f.result(value);
    const response = await f.run(body);
    assert.equal(response.status, status);
    assert.equal(JSON.stringify(response).includes("private database host"), false);
  }
});

test("permanent deletion is independent of restoration and excluded from non-admin role ceilings", () => {
  const permissions = load("lib/permissions.ts", {});
  assert.equal(permissions.hasPermission({ role: "admin" }, "crmArchive.purge"), true);
  assert.equal(permissions.hasPermission({ role: "admin", allowedPermissions: ["crmArchive.read", "crmArchive.restore"] }, "crmArchive.purge"), false);
  assert.equal(permissions.hasPermission({ role: "admin", allowedPermissions: ["crmArchive.purge"] }, "crmArchive.purge"), false);
  for (const role of ["manager", "administration", "senior", "employee", "viewer", "programmer"]) {
    assert.equal(permissions.hasPermission({ role, allowedPermissions: permissions.PERMISSIONS }, "crmArchive.purge"), false);
  }
});
