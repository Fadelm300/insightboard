import assert from "node:assert/strict";
import test from "node:test";
import { accessTestPlan, validateFixturePassword, validateLocalTestUrl } from "../scripts/access-test-plan.mjs";
import { provisionAccessTests } from "../scripts/provision-access-tests.mjs";
import { AccessVerificationError, verifyAccessTests } from "../scripts/verify-access-tests.mjs";

test("development access fixtures use unique test-only identities and preserve reserved role boundaries", () => {
  const plan = accessTestPlan();
  assert.equal(plan.length, 10);
  assert.equal(new Set(plan.map((user) => user.email)).size, plan.length);
  for (const user of plan) {
    assert.match(user.email, /@insightboard\.test$/);
    assert.equal("password" in user, false);
  }
  assert.equal(plan.find((user) => user.role === "programmer").isActive, false);
  assert.equal(plan.find((user) => user.key === "otherTeam").manager, "otherManager");
  assert.equal(plan.find((user) => user.key === "directory").allowedPermissions.includes("users.manage"), false);
});

test("fixture password and HTTP target validation reject weak input and non-local origins", () => {
  for (const value of [undefined, "short", "😀".repeat(20)]) assert.throws(() => validateFixturePassword(value));
  validateFixturePassword("fixture-only-password-123!");
  for (const value of [undefined, "https://example.com", "http://localhost.evil.test", "http://localhost:3000/path", "http://user:secret@localhost:3000"]) {
    assert.throws(() => validateLocalTestUrl(value));
  }
  assert.equal(validateLocalTestUrl("http://localhost:3000"), "http://localhost:3000");
});

test("fixture setup rejects another database or existing identities before hashing or insertion", async () => {
  const bcrypt = { hash() { throw new Error("Hashing must not run"); } };
  const session = { withTransaction: async (callback) => callback() };
  await assert.rejects(provisionAccessTests({ databaseName: "production" }, bcrypt, "fixture-only-password-123!", session), /Unexpected database/);
  const db = { databaseName: "insightboard_dev", collection: () => ({ countDocuments: async () => 1 }) };
  await assert.rejects(provisionAccessTests(db, bcrypt, "fixture-only-password-123!", session), /no account was overwritten/);
});

test("fixture creation only inserts new users with separate salts and explicit manager assignments", async () => {
  let inserted = [], nextId = 0;
  class ObjectId { constructor() { this.id = ++nextId; } }
  const original = Object.freeze({ _id: "existing", role: "admin", password: "existing-hash" });
  const users = {
    countDocuments: async () => 0,
    find: () => ({ sort: () => ({ toArray: async () => [original] }) }),
    insertMany: async (rows) => { inserted = rows; },
  };
  const db = { databaseName: "insightboard_dev", collection: (name) => { assert.equal(name, "users"); return users; } };
  let hashCalls = 0;
  const bcrypt = { hash: async (_password, cost) => { assert.equal(cost, 12); return `unique-hash-${++hashCalls}`; } };
  const session = { withTransaction: async (callback) => callback() };
  const result = await provisionAccessTests(db, bcrypt, "fixture-only-password-123!", session, ObjectId);
  assert.equal(inserted.length, 10);
  assert.equal(new Set(inserted.map((row) => row.password)).size, 10);
  assert.equal(inserted.find((row) => row.name === "QA Projects Employee").managedBy, inserted.find((row) => row.name === "QA Manager A")._id);
  assert.ok(result.every((row) => !("password" in row)));
  assert.equal(original.password, "existing-hash");
});

test("HTTP verification names the failed status without disclosing response bodies or passwords", async () => {
  await assert.rejects(verifyAccessTests("http://localhost:3000", "private-test-password", {
    fetchImpl: async () => Response.json({ secret: "private-response-secret" }, { status: 500 }),
  }), (error) => {
    assert.ok(error instanceof AccessVerificationError);
    assert.match(error.message, /admin: login: expected 200, received 500/);
    assert.equal(error.message.includes("private-response-secret"), false);
    assert.equal(error.message.includes("private-test-password"), false);
    return true;
  });
});

test("HTTP verification reports local connectivity failure without leaking its underlying error", async () => {
  await assert.rejects(verifyAccessTests("http://localhost:3000", "private-test-password", {
    fetchImpl: async () => { throw new Error("sensitive-underlying-error"); },
  }), (error) => {
    assert.ok(error instanceof AccessVerificationError);
    assert.match(error.message, /POST \/api\/auth\/login: local server could not be reached/);
    assert.equal(error.message.includes("sensitive-underlying-error"), false);
    return true;
  });
});

test("HTTP verification publishes progress and explicitly diagnoses a missing session cookie", async () => {
  const progress = [];
  await assert.rejects(verifyAccessTests("http://localhost:3000", "private-test-password", {
    fetchImpl: async () => Response.json({ success: true }, { status: 200 }),
    onResult: (result) => progress.push(result.check),
  }), /login returned no session cookie/);
  assert.deepEqual(progress, ["admin: login"]);
});
