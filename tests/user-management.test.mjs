import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
function load(file, dependencies = {}) {
  const exports = {};
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(compiled, {
    exports, Buffer, URL, Request,
    require(name) {
      if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
      return dependencies[name];
    },
  }, { filename: file });
  return exports;
}
const policy = load("lib/permissions.ts");
const actorId = "a".repeat(24), targetId = "b".repeat(24), otherId = "c".repeat(24);
const newInput = () => ({
  name: "Example Employee", email: "employee@example.invalid", role: "employee",
  allowedPermissions: ["projects.read", "projects.create"], isActive: true,
  password: "fixture-only-1234!",
});
const updateInput = () => {
  const { email: _email, password: _password, ...input } = newInput();
  void _email; void _password;
  return { ...input, version: 0 };
};

function harness({ actorRole = "manager", targetRole = "employee", managedBy = actorId, staleActor = false, failAudit = false } = {}) {
  const actor = { id: actorId, role: actorRole };
  let rows = new Map([
    [actorId, { _id: actorId, name: "Manager", email: "manager@example.invalid", role: actorRole, isActive: !staleActor }],
    [targetId, { _id: targetId, name: "Employee", email: "employee@example.invalid", role: targetRole, managedBy, authVersion: 0 }],
  ]);
  let sessions = [{ userId: targetId }], audit = [], hashes = [], ended = 0;
  const transaction = {
    async withTransaction(callback) {
      const before = structuredClone({ rows: [...rows], sessions, audit });
      try { return await callback(); }
      catch (error) { rows = new Map(before.rows); sessions = before.sessions; audit = before.audit; throw error; }
    },
    async endSession() { ended++; },
  };
  const query = (value) => ({
    select() { return this; },
    session(session) { assert.equal(session, transaction); return this; },
    async lean() { return value; },
  });
  const User = {
    findById(id) { return query(rows.get(id) ?? null); },
    findOneAndUpdate(filter, update, options) {
      assert.equal(options.session, transaction);
      const row = rows.get(filter._id);
      assert.equal(filter.$or[0].authVersion, row.authVersion);
      Object.assign(row, update.$set);
      row.authVersion += update.$inc.authVersion;
      return query(row);
    },
    async create(records, options) {
      assert.equal(options.session, transaction);
      const row = { ...records[0], _id: otherId };
      rows.set(otherId, row);
      return [row];
    },
  };
  const management = load("lib/userManagement.ts", {
    bcryptjs: { __esModule: true, default: { async hash(password, cost) { hashes.push({ password, cost }); return "HASHED_FIXTURE"; } } },
    mongoose: { __esModule: true, default: { startSession: async () => transaction } },
    "@/models/User": { __esModule: true, default: User },
    "@/models/Session": { __esModule: true, default: {
      deleteMany(filter) { return { async session(session) { assert.equal(session, transaction); sessions = sessions.filter((row) => row.userId !== filter.userId); } }; },
    } },
    "@/models/UserAuditEvent": { __esModule: true, default: {
      async create(records, options) {
        assert.equal(options.session, transaction);
        if (failAudit) throw new Error("Audit unavailable");
        audit.push(...records);
      },
    } },
    "@/lib/permissions": policy,
  });
  return { module: management, actor, get rows() { return rows; }, get sessions() { return sessions; }, get audit() { return audit; }, hashes, get ended() { return ended; } };
}

test("management input rejects operators, unknown fields, invalid types and incomplete read dependencies", () => {
  const { module } = harness();
  for (const body of [null, [], { ...newInput(), $set: {} }, { ...newInput(), isActive: "false" },
    { ...newInput(), name: "<script>" }, { ...newInput(), allowedPermissions: ["projects.create"] },
    { ...newInput(), managerId: { $ne: null } }, { ...newInput(), password: "short" },
    { ...newInput(), password: "😀".repeat(20) }]) {
    assert.throws(() => module.validateUserInput(body, true), { status: 400 });
  }
  assert.equal(module.validateUserInput({ ...newInput(), email: " EMPLOYEE@EXAMPLE.INVALID " }, true).email, "employee@example.invalid");
  assert.throws(() => module.validateUserInput({ ...updateInput(), email: "changed@example.invalid" }, false), { status: 400 });
  assert.throws(() => module.validateUserInput({ ...updateInput(), version: -1 }, false), { status: 400 });
});

test("management request parser bounds bytes and rejects malformed JSON", async () => {
  const { module } = harness();
  await assert.rejects(module.readUserInput(new Request("https://crm.example", { method: "POST", body: "{" }), true), { status: 400 });
  await assert.rejects(module.readUserInput(new Request("https://crm.example", { method: "POST", body: " ".repeat(16_385) }), true), { status: 413 });
  const input = await module.readUserInput(new Request("https://crm.example", { method: "POST", body: JSON.stringify(newInput()) }), true);
  assert.equal(input.name, "Example Employee");
});

test("manager creates staff with bcrypt cost 12 and safe response without a password", async () => {
  const h = harness();
  const result = await h.module.saveManagedUser(h.actor, newInput());
  assert.equal(h.hashes[0].cost, 12);
  assert.equal(h.rows.get(otherId).password, "HASHED_FIXTURE");
  assert.equal(h.rows.get(otherId).managedBy, actorId);
  assert.equal("password" in result, false);
  assert.equal(h.audit[0].action, "user.created");
  assert.equal(JSON.stringify(h.audit).includes(newInput().password), false);
  assert.equal(h.ended, 1);
});

test("account updates atomically increment revision, revoke sessions and record field names only", async () => {
  const h = harness();
  const result = await h.module.saveManagedUser(h.actor, { ...updateInput(), isActive: false }, targetId);
  assert.equal(result.version, 1);
  assert.equal(result.isActive, false);
  assert.equal(h.sessions.length, 0);
  assert.equal(h.audit[0].action, "user.updated");
  assert.equal(JSON.stringify(h.audit).includes("employee@example.invalid"), false);
  assert.equal("password" in result, false);
});

test("self, protected roles and other managers' teams cannot be modified", async () => {
  for (const targetRole of ["admin", "programmer", "administration", "manager"]) {
    const h = harness({ targetRole });
    await assert.rejects(h.module.saveManagedUser(h.actor, updateInput(), targetId), { status: 404 });
    assert.equal(h.audit.length, 0);
  }
  const h = harness({ managedBy: otherId });
  await assert.rejects(h.module.saveManagedUser(h.actor, updateInput(), targetId), { status: 404 });
  await assert.rejects(h.module.saveManagedUser(h.actor, updateInput(), actorId), { status: 404 });
});

test("stale forms and stale authenticated actor state cannot authorize account changes", async () => {
  const h = harness();
  await assert.rejects(h.module.saveManagedUser(h.actor, { ...updateInput(), version: 2 }, targetId), { status: 409 });
  const stale = harness({ staleActor: true });
  await assert.rejects(stale.module.saveManagedUser(stale.actor, updateInput(), targetId), { status: 403 });
  assert.equal(stale.audit.length, 0);
});

test("audit failure aborts the mocked transaction including user and session writes", async () => {
  const h = harness({ failAudit: true });
  await assert.rejects(h.module.saveManagedUser(h.actor, updateInput(), targetId), /Audit unavailable/);
  assert.equal(h.rows.get(targetId).authVersion, 0);
  assert.equal(h.sessions.length, 1);
  assert.equal(h.audit.length, 0);
  assert.equal(h.ended, 1);
});

test("delegation cannot create a privileged account or transfer another manager's team", async () => {
  const h = harness();
  await assert.rejects(h.module.saveManagedUser(h.actor, { ...newInput(), role: "admin" }), { status: 403 });
  await assert.rejects(h.module.saveManagedUser(h.actor, { ...newInput(), managerId: otherId }), { status: 403 });
  const directory = harness({ actorRole: "administration" });
  await assert.rejects(directory.module.saveManagedUser(directory.actor, newInput()), { status: 403 });
});
