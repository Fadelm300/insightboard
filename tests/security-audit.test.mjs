import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as crypto from "node:crypto";
import * as net from "node:net";
import mongoose from "mongoose";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
function load(file, dependencies = {}, env = {}, Clock = Date) {
  const exports = {};
  const output = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(output, {
    exports, Buffer, TextDecoder, URL, Date: Clock, process: { env },
    require(name) { if (!(name in dependencies)) throw Error(`Unexpected import: ${name}`); return dependencies[name]; },
  }, { filename: file });
  return exports;
}
const policy = load("lib/sessionPolicy.ts", {}, { NODE_ENV: "production" });
const permissions = load("lib/permissions.ts");
const id = "a".repeat(24);
const account = { name: "Audit Account", email: "audit@example.invalid" };
function request(token, overrides = {}) {
  return { method: "POST", url: "https://crm.example/api/auth/login?secret=DO_NOT_STORE", headers: new Headers({
    origin: "https://crm.example", "x-insightboard-request": "1", "user-agent": "Audit test browser",
    "x-vercel-forwarded-for": "203.0.113.4", "x-vercel-ip-country": "BH",
    cookie: "private-cookie", authorization: "Bearer PRIVATE_AUTH", ...overrides,
  }), cookies: { get: () => token ? { value: token } : undefined } };
}
const contextModule = (env = { VERCEL: "1" }) => load("lib/securityContext.ts", { "node:net": net }, env);
const context = contextModule();

test("IP and country come only from the trusted Vercel source, with no browser permission API", () => {
  const trusted = context.securityRequestContext(request());
  assert.equal(trusted.ip, "203.0.113.4"); assert.equal(trusted.country, "BH");
  const local = contextModule({}).securityRequestContext(request());
  assert.equal(local.ip, null); assert.equal(local.country, null); assert.equal(local.source, "unavailable");
  for (const ip of ["invalid", "999.1.1.1", "x".repeat(100)]) {
    const data = context.securityRequestContext(request(null, { "x-vercel-forwarded-for": ip }));
    assert.equal(data.ip, null); assert.equal(data.country, null);
  }
  assert.equal(context.securityRequestContext(request(null, { "x-vercel-forwarded-for": "2001:db8::1" })).ip, "2001:db8::1");
  assert.equal(context.securityRequestContext(request(null, { "x-vercel-ip-country": "Bahrain" })).country, null);
  const forwarded = context.securityRequestContext(request(null, { "x-vercel-forwarded-for": "", "x-forwarded-for": "198.51.100.22" }));
  assert.equal(forwarded.ip, null);
});

test("request metadata is bounded and excludes credentials, query strings and arbitrary route segments", () => {
  const req = request(null, { "user-agent": "x".repeat(2000) });
  req.url = "https://crm.example/api/users/PRIVATE_PATH_ID?password=PRIVATE_PASSWORD";
  const data = context.securityRequestContext(req);
  assert.equal(data.userAgent.length, 512); assert.equal(data.path, "/api/users/:id");
  assert.doesNotMatch(JSON.stringify(data), /PRIVATE_|DO_NOT_STORE|private-cookie|authorization|secret=/);
  assert.equal(context.securityEmail({ $ne: "" }), undefined);
  assert.equal(context.securityEmail("bad\n@example.invalid"), undefined);
  assert.equal(context.securityEmail(" AUDIT@EXAMPLE.INVALID "), account.email);
});

// Database test double implements the Mongo expressions used by the transactional ledger updates.
function expression(value, row) {
  if (value instanceof Date) return value;
  if (typeof value === "string" && value.startsWith("$")) return row[value.slice(1)];
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => expression(item, row));
  const [[op, input]] = Object.entries(value);
  if (op === "$literal") return input;
  const args = expression(input, row);
  if (op === "$lte") return args[0] <= args[1];
  if (op === "$min") return args.reduce((a, b) => a < b ? a : b);
  if (op === "$cond") return args[0] ? args[1] : args[2];
  if (op === "$add") return new Date(args.reduce((sum, item) => sum + Number(item), 0));
  throw Error(`Unsupported expression ${op}`);
}

function harness() {
  let now = 1_800_000_000_000, live = [], ledger = [], events = [], failAudit = false, failRenew = false;
  let ended = 0;
  const logs = [], cookieWrites = [];
  const user = { _id: id, ...account, role: "admin", authVersion: 0 };
  class Clock extends Date { constructor(value) { super(0); return new Date(value === undefined ? now : value); } static now() { return now; } }
  const transaction = {
    async withTransaction(fn) {
      const before = structuredClone({ live, ledger, events });
      try { return await fn(); }
      catch (error) { ({ live, ledger, events } = before); throw error; }
    },
    async endSession() { ended++; },
  };
  const query = (fn) => ({ session(tx) { assert.equal(tx, transaction); return this; }, async lean() { return fn(); } });
  const Session = {
    findOne: ({ tokenHash }) => query(() => live.find((row) => row.tokenHash === tokenHash) ?? null),
    async create(rows, options) { assert.equal(options.session, transaction); live.push(...rows); },
    async deleteOne({ tokenHash }, options) { assert.equal(options.session, transaction); live = live.filter((row) => row.tokenHash !== tokenHash); },
    findOneAndUpdate(filter, update, options) { return query(() => {
      assert.equal(options.session, transaction);
      const row = live.find((row) => row.tokenHash === filter.tokenHash && row.expiresAt > filter.expiresAt.$gt && row.absoluteExpiresAt > filter.absoluteExpiresAt.$gt);
      if (!row) return null;
      for (const [key, value] of Object.entries(update.$max)) if (value > row[key]) row[key] = value;
      return row;
    }); },
  };
  const SecuritySessionAudit = {
    async create(rows, options) {
      assert.equal(options.session, transaction);
      if (failAudit) throw Error("private database failure");
      ledger.push(...rows.map((row) => ({ ...row, closedAt: null, closeReason: null })));
    },
    async updateOne(filter, update, options) {
      assert.equal(options.session, transaction);
      if (failRenew) throw Error("private database failure");
      const row = ledger.find((row) => row._id === filter._id && row.closedAt === null);
      if (!row) return { matchedCount: 0 };
      if (Array.isArray(update)) {
        assert.equal(options.updatePipeline, true);
        const values = Object.fromEntries(Object.entries(update[0].$set).map(([key, value]) => [key, expression(value, row)]));
        Object.assign(row, values);
      } else Object.assign(row, update.$set);
      return { matchedCount: 1 };
    },
    async updateMany(filter, pipeline, options) {
      assert.equal(options.session, transaction);
      assert.equal(options.updatePipeline, true);
      for (const row of ledger.filter((row) => row.userId === filter.userId && row.closedAt === null && row.purgeAt > filter.purgeAt.$gt)) {
        Object.assign(row, Object.fromEntries(Object.entries(pipeline[0].$set).map(([key, value]) => [key, expression(value, row)])));
      }
    },
  };
  const connectDB = async () => ({ startSession: async () => transaction });
  const security = load("lib/securityAudit.ts", {
    "node:crypto": crypto, "@/lib/mongodb": { __esModule: true, default: connectDB },
    "@/lib/serverLogger": { logServerError: (event) => logs.push(event) },
    "@/lib/securityContext": context,
    "@/models/SecurityAuditEvent": { __esModule: true, default: { async create(event) { if (failAudit) throw Error("private-password"); events.push(event); } } },
    "@/models/SecuritySessionAudit": { __esModule: true, default: SecuritySessionAudit },
  }, { VERCEL: "1" }, Clock);
  const auth = load("lib/auth.ts", {
    "node:crypto": crypto, react: { cache: (fn) => fn },
    "next/headers": { cookies: async () => ({ get: () => undefined }) },
    "@/lib/mongodb": { __esModule: true, default: connectDB }, "@/lib/securityAudit": security,
    "@/lib/securityContext": context, "@/lib/permissions": permissions, "@/lib/sessionPolicy": policy,
    "@/models/Session": { __esModule: true, default: Session },
    "@/models/User": { __esModule: true, default: { findById: () => ({ select: () => ({ lean: async () => user }) }) } },
  }, { NODE_ENV: "production", VERCEL: "1" }, Clock);
  const response = { cookies: { set: (...args) => cookieWrites.push(args) }, headers: new Headers() };
  async function login(token) { await auth.createSession(id, request(token), response, 0, account); return cookieWrites.at(-1)[1]; }
  return { auth, security, response, login, user, logs, cookieWrites, transaction,
    get live() { return live; }, get ledger() { return ledger; }, get events() { return events; }, get now() { return now; }, get ended() { return ended; },
    advance(ms) { now += ms; }, failAudit() { failAudit = true; }, failRenew() { failRenew = true; },
    ttlCleanup() { live = live.filter((row) => row.expiresAt.getTime() > now); },
  };
}

test("successful sign-in commits a separate durable ledger without any credential or raw request payload", async () => {
  const h = harness(), token = await h.login();
  assert.equal(h.live.length, 1); assert.equal(h.ledger.length, 1);
  assert.equal(h.ledger[0]._id, h.live[0].auditId);
  assert.notEqual(h.ledger[0]._id, token);
  assert.equal(h.ledger[0].accountName, account.name);
  assert.equal(h.ledger[0].context.country, "BH");
  assert.doesNotMatch(JSON.stringify(h.ledger), new RegExp(`${token}|${h.live[0].tokenHash}|private-cookie|PRIVATE_AUTH|DO_NOT_STORE`));
  assert.equal(h.ledger[0].purgeAt - h.ledger[0].expiresAt, 90 * 86400_000);
  assert.equal(h.ended, 1);
});

test("audit failure rolls back sign-in and prevents cookie issuance", async () => {
  const h = harness(); h.failAudit();
  await assert.rejects(h.login());
  assert.equal(h.live.length, 0); assert.equal(h.ledger.length, 0); assert.equal(h.cookieWrites.length, 0);
  assert.equal(h.ended, 1);
});

test("renewal changes the live and durable deadlines together; audit failure rolls both back", async () => {
  const h = harness(), token = await h.login();
  h.advance(10 * 60_000);
  await h.auth.renewSession(request(token), true);
  assert.equal(h.ledger[0].expiresAt.getTime(), h.live[0].expiresAt.getTime());
  const deadline = h.live[0].expiresAt.getTime();
  h.advance(60_000); h.failRenew();
  await assert.rejects(h.auth.renewSession(request(token), true));
  assert.equal(h.live[0].expiresAt.getTime(), deadline);
  assert.equal(h.ledger[0].expiresAt.getTime(), deadline);
});

test("explicit logout records its time once, revokes the credential, and is not automatic expiry", async () => {
  const h = harness(), token = await h.login(); h.advance(60_000);
  await h.auth.revokeSession(request(token), h.response);
  assert.equal(h.live.length, 0); assert.equal(h.ledger[0].closeReason, "logout");
  assert.equal(h.ledger[0].closedAt.getTime(), h.now);
  assert.equal(h.ledger[0].purgeAt - h.ledger[0].closedAt, 90 * 86400_000);
  await h.auth.revokeSession(request(token), h.response);
  assert.equal(h.ledger.length, 1);
  assert.equal(await h.auth.getAuthUser(request(token)), null);
});

test("expiry remains independently reconstructable after browser silence and live-session TTL deletion", async () => {
  const h = harness(), token = await h.login(), deadline = h.ledger[0].expiresAt.getTime();
  h.advance(20 * 60_000); h.ttlCleanup();
  assert.equal(h.live.length, 0); assert.equal(h.ledger.length, 1);
  assert.equal(h.ledger[0].expiresAt.getTime(), deadline);
  assert.equal(h.ledger[0].closedAt, null);
  await h.auth.revokeSession(request(token), h.response);
  assert.equal(h.ledger[0].closeReason, null); // Mongo history derives expiry rather than inventing a logout.
  assert.equal(await h.auth.renewSession(request(token), true), null);
});

test("logout after expiry preserves the actual deadline and timeout reason rather than the later request time", async () => {
  const h = harness(), token = await h.login(), deadline = h.live[0].expiresAt.getTime();
  h.advance(21 * 60_000);
  await h.auth.revokeSession(request(token), h.response);
  assert.equal(h.ledger[0].closeReason, "idle_timeout");
  assert.equal(h.ledger[0].closedAt.getTime(), deadline);
});

test("absolute timeout is distinct from idle timeout, and no renewal exceeds eight hours", async () => {
  const h = harness(), token = await h.login();
  // Repeated valid activity until the absolute deadline approaches.
  for (let i = 0; i < 47; i++) { h.advance(10 * 60_000); await h.auth.renewSession(request(token), true); }
  assert.equal(h.ledger[0].expiresAt.getTime(), h.ledger[0].absoluteExpiresAt.getTime());
  h.advance(10 * 60_000);
  await h.auth.revokeSession(request(token), h.response);
  assert.equal(h.ledger[0].closeReason, "absolute_timeout");
});

test("replacement closes only the previous browser session and survives duplicate logout", async () => {
  const h = harness(), first = await h.login(); h.advance(10_000);
  const second = await h.login(first);
  assert.equal(h.live.length, 1); assert.equal(h.ledger.length, 2);
  assert.equal(h.ledger[0].closeReason, "replaced");
  assert.equal(h.ledger[1].closedAt, null);
  await h.auth.revokeSession(request(first), h.response);
  assert.equal(h.ledger[0].closeReason, "replaced");
  assert.ok(await h.auth.getAuthUser(request(second)));
});

test("disabled or revised accounts close their audit alongside credential invalidation", async () => {
  const h = harness(), token = await h.login(); h.advance(1000); h.user.isActive = false;
  assert.equal(await h.auth.getAuthUser(request(token)), null);
  assert.equal(h.live.length, 0); assert.equal(h.ledger[0].closeReason, "account_invalid");
});

test("management-driven revocation records the actor and retains prior expiry reasons", async () => {
  const h = harness(); await h.login(); h.advance(21 * 60_000);
  await h.login();
  await h.security.withSecurityTransaction((tx) => h.security.closeSecuritySessionsForUser(id, "b".repeat(24), tx));
  assert.equal(h.ledger[0].closeReason, "idle_timeout");
  assert.equal(h.ledger[1].closeReason, "account_changed");
  assert.equal(h.ledger[1].closedBy, "b".repeat(24));
});

test("failed-attempt audit stores safe metadata even in demo mode, and failures emit only a fixed server event", async () => {
  const h = harness();
  await h.security.recordSecurityEvent(request(), { kind: "login.failed", reason: "invalid_credentials", status: 401, attemptedEmail: account.email, password: "DO_NOT_STORE" });
  assert.equal(h.events[0].attemptedEmail, account.email);
  assert.equal(h.events[0].context.ip, "203.0.113.4");
  assert.doesNotMatch(JSON.stringify(h.events), /DO_NOT_STORE|PRIVATE_AUTH|private-cookie/);
  h.failAudit();
  await h.security.recordSecurityEvent(request(), { kind: "registration.blocked", reason: "registration_closed", status: 403 });
  assert.deepEqual(h.logs, ["SECURITY_AUDIT_ERROR"]);
});

test("Mongo audit schemas have independent TTL indexes, omit version keys, and strip unexpected credential fields", async () => {
  const connection = mongoose.createConnection();
  const bindings = { Schema: mongoose.Schema, models: {}, model: connection.model.bind(connection) };
  const eventModule = load("models/SecurityAuditEvent.ts", { mongoose: bindings });
  const sessionModule = load("models/SecuritySessionAudit.ts", { mongoose: bindings, "@/models/SecurityAuditEvent": eventModule });
  for (const Model of [eventModule.default, sessionModule.default]) {
    assert.ok(Model.schema.indexes().some(([fields, opts]) => fields.purgeAt === 1 && opts.expireAfterSeconds === 0));
    assert.equal(Model.schema.options.versionKey, false);
    assert.equal(Model.schema.path("tokenHash"), undefined);
  }
  const now = new Date();
  const h = harness();
  await h.login();
  const storedSession = new sessionModule.default(h.ledger[0]).toObject();
  for (const field of ["startedAt", "lastActiveAt", "expiresAt", "absoluteExpiresAt", "purgeAt"]) {
    assert.equal(Object.prototype.toString.call(storedSession[field]), "[object Date]", `${field} must remain a date after Mongoose serialization`);
  }
  const doc = new eventModule.default({ _id: crypto.randomUUID(), kind: "login.failed", reason: "invalid_credentials", status: 401,
    context: context.securityRequestContext(request()), occurredAt: now, purgeAt: new Date(now.getTime() + 1000), password: "DO_NOT_STORE" });
  await doc.validate();
  assert.equal(doc.toObject().password, undefined);
  doc.kind = "arbitrary-event";
  await assert.rejects(doc.validate());
  await connection.close();
});

function loginFixture({ throttled = false, valid = false } = {}) {
  const events = [], created = [], make = (message, status) => Response.json({ message }, { status });
  const route = load("app/api/auth/login/route.ts", {
    "next/server": { NextResponse: { json: Response.json.bind(Response) } },
    bcryptjs: { __esModule: true, default: { compare: async () => valid } },
    "@/lib/mongodb": { __esModule: true, default: async () => {} },
    "@/lib/auth": { createSession: async (...args) => created.push(args) },
    "@/lib/apiResponse": { errorResponse: make, successResponse: () => make("success", 200) },
    "@/lib/sessionPolicy": policy, "@/lib/permissions": permissions,
    "@/lib/securityAudit": { recordSecurityEvent: async (_req, event) => events.push(event) },
    "@/lib/serverLogger": { logServerError: () => {} }, "@/lib/boundedJson": load("lib/boundedJson.ts"),
    "@/lib/loginRateLimit": { allowLoginAttempt: async () => !throttled },
    "@/models/User": { __esModule: true, default: { findOne: async () => ({ _id: id, ...account, role: "admin", password: "PRIVATE_HASH" }) } },
  });
  const req = (body) => new Request("https://crm.example/api/auth/login", {
    method: "POST", headers: { origin: "https://crm.example", "x-insightboard-request": "1", "content-type": "application/json" }, body: JSON.stringify(body),
  });
  return { route, events, created, req };
}

test("login audit distinguishes invalid credentials, throttling and malformed input without copying submitted passwords", async () => {
  for (const [options, body, status, reason] of [
    [{}, { email: account.email, password: "DO_NOT_STORE" }, 401, "invalid_credentials"],
    [{ throttled: true }, { email: account.email, password: "DO_NOT_STORE" }, 429, "rate_limit"],
    [{}, { email: { $ne: "" }, password: "DO_NOT_STORE" }, 401, "invalid_request"],
    [{}, { email: account.email, password: "x".repeat(5000) }, 413, "body_too_large"],
  ]) {
    const h = loginFixture(options), response = await h.route.POST(h.req(body));
    assert.equal(response.status, status); assert.equal(h.events.length, 1); assert.equal(h.events[0].reason, reason);
    assert.equal(h.created.length, 0); assert.doesNotMatch(JSON.stringify(h.events), /DO_NOT_STORE|PRIVATE_HASH/);
  }
  const h = loginFixture({ valid: true });
  assert.equal((await h.route.POST(h.req({ email: account.email, password: "DO_NOT_STORE" }))).status, 200);
  assert.equal(h.created[0][4].name, account.name);
  assert.equal(h.events.length, 0); // Successful sign-ins are the durable session ledger.
});

test("public account creation remains closed and logs the attempt without consuming its body", async () => {
  const events = [];
  const { POST } = load("app/api/auth/register/route.ts", {
    "@/lib/apiResponse": { errorResponse: (message, status) => Response.json({ message }, { status }) },
    "@/lib/demoMode": { blockIfDemoMode: () => null },
    "@/lib/securityAudit": { recordSecurityEvent: async (_req, event) => events.push(event) },
  });
  const req = new Request("https://crm.example/api/auth/register", { method: "POST", body: "PRIVATE_PASSWORD" });
  assert.equal((await POST(req)).status, 403); assert.equal(req.bodyUsed, false);
  assert.equal(events[0].kind, "registration.blocked");
});
