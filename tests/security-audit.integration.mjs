// Explicit opt-in integration suite. Only a disposable localhost replica set is accepted.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import test, { before, after, beforeEach } from "node:test";
import { fileURLToPath } from "node:url";
import * as crypto from "node:crypto";
import * as net from "node:net";
import mongoose from "mongoose";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
const uri = process.env.SECURITY_AUDIT_TEST_URI ?? "mongodb://127.0.0.1:27019/?replicaSet=rs0&directConnection=true";
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost):27019\/(?:\?|$)/.test(uri)) {
  throw Error("Integration tests accept only the disposable localhost MongoDB instance on port 27019");
}
let connection, Session, Ledger, Events, User, security, auth, history;
let now = Date.now();
let databaseNow = now;
class Clock extends Date {
  // Mongoose clones custom Date subclasses through valueOf(), producing BSON numbers.
  // Simulate the clock while returning an ordinary Date that remains a BSON Date.
  constructor(value) { super(0); return new Date(value === undefined ? now : value); }
  static now() { return now; }
}
function load(file, dependencies = {}, env = {}) {
  const exports = {};
  const output = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(output, { exports, Buffer, URL, Date: file.startsWith("models/") ? Date : Clock, process: { env },
    require(name) { if (!(name in dependencies)) throw Error(`Unexpected import: ${name}`); return dependencies[name]; },
  }, { filename: file });
  return exports;
}
const id = "a".repeat(24), actorId = "b".repeat(24);
const account = { name: "Integration Fixture", email: "fixture@example.invalid" };
const cookies = [];
const response = { cookies: { set: (...args) => cookies.push(args) }, headers: new Headers() };
function request(token) {
  return { method: "POST", url: "https://crm.example/api/auth/login", headers: new Headers({
    origin: "https://crm.example", "x-insightboard-request": "1", "x-vercel-forwarded-for": "203.0.113.10",
    "x-vercel-ip-country": "BH", "user-agent": "Fixture browser", cookie: "DO_NOT_STORE",
  }), cookies: { get: () => token ? { value: token } : undefined } };
}
async function login(token) {
  await auth.createSession(id, request(token), response, 0, account);
  return cookies.at(-1)[1];
}
async function rows() {
  const types = await Ledger.aggregate([{ $limit: 1 }, { $project: {
    startType: { $type: "$startedAt" }, purgeType: { $type: "$purgeAt" },
  } }]);
  if (types.length) {
    assert.equal(types[0].startType, "date", "Session start must be a BSON Date");
    assert.equal(types[0].purgeType, "date", "Session retention must be a BSON Date for the TTL index");
  }
  const records = await Ledger.aggregate(history.securityAuditHistoryPipeline(1000));
  if (records.length === 0 && await Ledger.countDocuments() > 0) {
    const diagnostic = await Ledger.aggregate([{ $limit: 1 }, { $project: {
      _id: 0, startedAt: 1, expiresAt: 1, purgeAt: 1, serverNow: "$$NOW",
      startType: { $type: "$startedAt" }, purgeType: { $type: "$purgeAt" },
      started: { $lte: ["$startedAt", "$$NOW"] }, retained: { $gt: ["$purgeAt", "$$NOW"] },
    } }]);
    throw Error(`Security history unexpectedly empty. Fixture date diagnostics: ${JSON.stringify(diagnostic)}`);
  }
  return records;
}

before(async () => {
  const dbName = `insightboard_security_audit_test_${crypto.randomBytes(8).toString("hex")}`;
  connection = await mongoose.createConnection(uri, { dbName, serverSelectionTimeoutMS: 5000 }).asPromise();
  const bindings = { Schema: mongoose.Schema, models: {}, model: connection.model.bind(connection) };
  const eventModule = load("models/SecurityAuditEvent.ts", { mongoose: bindings });
  Events = eventModule.default;
  Ledger = load("models/SecuritySessionAudit.ts", { mongoose: bindings, "@/models/SecurityAuditEvent": eventModule }).default;
  Session = load("models/Session.ts", { mongoose: bindings }).default;
  User = connection.model("User", new mongoose.Schema({ name: String, email: String, role: String, authVersion: Number, isActive: Boolean }));
  await Promise.all([Events.init(), Ledger.init(), Session.init(), User.init()]);
  const connectDB = async () => connection;
  const context = load("lib/securityContext.ts", { "node:net": net }, { VERCEL: "1" });
  security = load("lib/securityAudit.ts", {
    "node:crypto": crypto, "@/lib/mongodb": { __esModule: true, default: connectDB },
    "@/lib/serverLogger": { logServerError: () => {} }, "@/lib/securityContext": context,
    "@/models/SecurityAuditEvent": eventModule,
    "@/models/SecuritySessionAudit": { __esModule: true, default: Ledger },
  });
  auth = load("lib/auth.ts", {
    "node:crypto": crypto, react: { cache: (fn) => fn },
    "next/headers": { cookies: async () => ({ get: () => undefined }) },
    "@/lib/mongodb": { __esModule: true, default: connectDB }, "@/lib/securityAudit": security,
    "@/lib/securityContext": context, "@/lib/permissions": load("lib/permissions.ts"),
    "@/lib/sessionPolicy": load("lib/sessionPolicy.ts", {}, { NODE_ENV: "production" }),
    "@/models/Session": { __esModule: true, default: Session }, "@/models/User": { __esModule: true, default: User },
  }, { NODE_ENV: "production" });
  history = load("lib/securityAuditHistory.ts");
});

beforeEach(async () => {
  // The query uses MongoDB's $$NOW. Anchor the simulated clock to the same server,
  // including when Docker Desktop and the WSL host clocks have drifted apart.
  const hello = await connection.db.admin().command({ hello: 1 });
  databaseNow = hello.localTime.getTime();
  now = databaseNow - 5 * 60_000;
  cookies.length = 0;
  await Promise.all([Session.deleteMany({}), Ledger.deleteMany({}), Events.deleteMany({}), User.deleteMany({})]);
  await User.create({ _id: id, ...account, role: "admin", authVersion: 0, isActive: true });
});

after(async () => {
  if (!connection) return;
  // Never drop a supplied database: only this suite's random, explicitly named fixture database.
  if (/^insightboard_security_audit_test_[a-f0-9]{16}$/.test(connection.name)) await connection.dropDatabase();
  await connection.close();
});

test("real Mongo: sign-in, renewal and explicit logout produce one start and one end with no credentials", async () => {
  const token = await login();
  let records = await rows();
  assert.equal(records.length, 1); assert.equal(records[0].kind, "login.success");
  const session = await Session.findOne().lean();
  const initial = session.expiresAt.getTime();
  now += 60_000;
  await auth.renewSession(request(token), true);
  const ledger = await Ledger.findOne().lean(), updated = await Session.findOne().lean();
  assert.ok(updated.expiresAt.getTime() > initial);
  assert.equal(updated.expiresAt.getTime(), ledger.expiresAt.getTime());
  await auth.revokeSession(request(token), response);
  records = await rows();
  assert.equal(records.filter((row) => row.kind === "session.logout").length, 1);
  assert.equal(await Session.countDocuments(), 0);
  assert.doesNotMatch(JSON.stringify(records), new RegExp(`${token}|${session.tokenHash}|DO_NOT_STORE`));
  assert.equal(records[0].context.ip, "203.0.113.10");
});

test("real Mongo: timeout is visible without any further request or live-session record", async () => {
  now = databaseNow - 30 * 60_000;
  await login();
  await Session.deleteMany({}); // Simulate completed TTL cleanup, with no logout or renewal.
  const records = await rows();
  assert.equal(records.filter((row) => row.kind === "login.success").length, 1);
  const ended = records.find((row) => row.kind === "session.expired");
  assert.equal(ended.reason, "idle_timeout");
  assert.equal(ended.occurredAt.getTime(), (await Ledger.findOne().lean()).expiresAt.getTime());
  assert.equal(records.some((row) => row.kind === "session.logout"), false);
});

test("real Mongo: absolute timeout and replacement remain distinct; expired logout cannot rewrite history", async () => {
  const first = await login();
  await login(first);
  assert.equal((await rows()).filter((row) => row.kind === "session.replaced").length, 1);
  const live = await Session.findOne().lean();
  const deadline = new Date(databaseNow - 1000);
  await Session.updateOne({ _id: live._id }, { $set: { expiresAt: deadline, absoluteExpiresAt: deadline } });
  await Ledger.updateOne({ _id: live.auditId }, { $set: { expiresAt: deadline, absoluteExpiresAt: deadline } });
  now = databaseNow;
  await auth.revokeSession(request(cookies.at(-1)[1]), response);
  const end = (await rows()).find((row) => row.kind === "session.expired");
  assert.equal(end.reason, "absolute_timeout"); assert.equal(end.occurredAt.getTime(), deadline.getTime());
});

test("real Mongo: ledger failure aborts live writes, replacement and cookie issuance", async () => {
  const first = await login(), original = await Session.findOne().lean();
  const count = cookies.length;
  await assert.rejects(auth.createSession(id, request(first), response, 0, { name: "", email: account.email }));
  assert.equal(cookies.length, count); assert.equal(await Ledger.countDocuments(), 1);
  assert.equal((await Session.findOne().lean()).tokenHash, original.tokenHash);
  assert.equal((await Ledger.findOne().lean()).closedAt, null);
});

test("real Mongo: concurrent logout and renewal never leave a valid unaudited credential", async () => {
  const token = await login(); now += 60_000;
  await Promise.all([auth.revokeSession(request(token), response), auth.renewSession(request(token), true)]);
  assert.equal(await Session.countDocuments(), 0);
  assert.equal((await rows()).filter((row) => row.kind === "session.logout").length, 1);
});

test("real Mongo: account revocation records the actor in the same transaction", async () => {
  await login();
  await security.withSecurityTransaction(async (tx) => {
    await security.closeSecuritySessionsForUser(id, actorId, tx);
    await Session.deleteMany({ userId: id }).session(tx);
  });
  const end = (await rows()).find((row) => row.kind === "session.revoked");
  assert.equal(end.reason, "account_changed"); assert.equal(end.closedBy, actorId);
});

test("real Mongo: events join the session history, expire separately, and future deadlines stay out", async () => {
  await login();
  await security.recordSecurityEvent(request(), { kind: "login.rate_limited", reason: "rate_limit", status: 429, attemptedEmail: account.email });
  let records = await rows();
  assert.equal(records.length, 2); assert.equal(records.some((row) => row.kind === "session.expired"), false);
  assert.equal(records.find((row) => row.kind === "login.rate_limited").status, 429);
  await Events.updateMany({}, { $set: { purgeAt: new Date(databaseNow - 1000) } });
  records = await rows();
  assert.equal(records.length, 1);
  for (const Model of [Ledger, Events]) {
    const indexes = await Model.collection.indexes();
    assert.ok(indexes.some((index) => index.key.purgeAt === 1 && index.expireAfterSeconds === 0));
  }
});
