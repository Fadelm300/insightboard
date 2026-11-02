import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as crypto from "node:crypto";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));

function load(relative, dependencies = {}, env = {}, Clock = Date) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, Buffer, URL, Date: Clock, process: { env },
    require(name) {
      if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
      return dependencies[name];
    },
  }, { filename: relative });
  return exports;
}

const policy = load("lib/sessionPolicy.ts");
const headers = (origin = "https://crm.example", custom = "1") => new Headers({ origin, "x-insightboard-request": custom });

test("idle policy is 2 minutes locally, 20 in production, with an 8-hour absolute cap", () => {
  assert.equal(policy.sessionIdleMs({ NODE_ENV: "development" }), 120_000);
  assert.equal(policy.sessionIdleMs({ NODE_ENV: "production" }), 1_200_000);
  assert.equal(policy.SESSION_ABSOLUTE_MS, 28_800_000);
  assert.equal(policy.SESSION_WARNING_MS, 30_000);
});

test("session expires exactly at either server deadline, independent of TTL cleanup", () => {
  assert.equal(policy.isSessionExpired(new Date(1000), new Date(2000), 999), false);
  assert.equal(policy.isSessionExpired(new Date(1000), new Date(2000), 1000), true);
  assert.equal(policy.isSessionExpired(new Date(3000), new Date(2000), 2000), true);
  assert.equal(policy.nextSessionExpiry(1000, 1100, 5000).getTime(), 1100);
});

test("production cookie is host-only, HttpOnly, Secure, Lax and root-scoped", () => {
  const options = policy.sessionCookieOptions({ NODE_ENV: "production" });
  assert.equal(policy.sessionCookieName({ NODE_ENV: "production" }), "__Host-insightboard_session");
  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.path, "/");
  assert.equal("domain" in options, false);
  assert.equal(policy.sessionCookieOptions({ NODE_ENV: "development" }).secure, false);
});

test("unsafe requests require exact Origin and custom header, including sibling subdomains", () => {
  const req = { method: "POST", url: "https://crm.example/api/clients", headers: headers() };
  assert.equal(policy.isTrustedMutation(req), true);
  for (const other of ["https://evil.example", "https://sub.crm.example", "http://crm.example", "null"]) {
    assert.equal(policy.isTrustedMutation({ ...req, headers: headers(other) }), false);
  }
  assert.equal(policy.isTrustedMutation({ ...req, headers: headers("https://crm.example", "") }), false);
  assert.equal(policy.isTrustedMutation({ ...req, headers: new Headers() }), false);
  const crossSite = headers(); crossSite.set("sec-fetch-site", "cross-site");
  assert.equal(policy.isTrustedMutation({ ...req, headers: crossSite }), false);
});

function sessionHarness() {
  let now = 1_700_000_000_000;
  let rows = [];
  let connections = 0;
  let mutations = 0;
  let userPresent = true;
  class Clock extends Date {
    constructor(value) { super(value === undefined ? now : value); }
    static now() { return now; }
  }
  const user = { _id: { toString: () => "user-1" }, name: "Example", email: "example@example.invalid", role: "admin" };
  const Session = {
    create: async (row) => { rows.push(row); },
    deleteOne: async ({ tokenHash }) => { rows = rows.filter((row) => row.tokenHash !== tokenHash); },
    findOne: ({ tokenHash }) => ({ lean: async () => rows.find((row) => row.tokenHash === tokenHash) ?? null }),
    findOneAndUpdate: (query, update) => ({ lean: async () => {
      const row = rows.find((entry) => entry.tokenHash === query.tokenHash && entry.expiresAt > query.expiresAt.$gt && entry.absoluteExpiresAt > query.absoluteExpiresAt.$gt);
      if (!row) return null;
      mutations += 1;
      if (update.$max.expiresAt > row.expiresAt) row.expiresAt = update.$max.expiresAt;
      return row;
    } }),
  };
  const auth = load("lib/auth.ts", {
    "node:crypto": crypto,
    "next/headers": { cookies: async () => ({ get: () => undefined }) },
    "@/lib/mongodb": { __esModule: true, default: async () => { connections += 1; } },
    "@/lib/sessionPolicy": load("lib/sessionPolicy.ts", {}, { NODE_ENV: "production" }),
    "@/models/Session": { __esModule: true, default: Session },
    "@/models/User": { __esModule: true, default: { findById: () => ({ select: () => ({ lean: async () => userPresent ? user : null }) }) } },
  }, { NODE_ENV: "production" }, Clock);
  const cookieWrites = [];
  const response = { cookies: { set: (...args) => cookieWrites.push(args) }, headers: new Headers() };
  function request(token, method = "GET") {
    return { method, url: "https://crm.example/api/auth/renew", headers: headers(), cookies: { get: () => token ? { value: token } : undefined } };
  }
  return {
    auth, response, request, cookieWrites,
    get rows() { return rows; }, get connections() { return connections; }, get mutations() { return mutations; },
    advance(ms) { now += ms; }, removeUser() { userPresent = false; },
  };
}

test("login creates a random identifier but persists only its hash; missing or malformed cookies skip DB", async () => {
  const h = sessionHarness();
  assert.equal(await h.auth.getAuthUser(h.request(undefined)), null);
  assert.equal(await h.auth.getAuthUser(h.request("legacy.jwt.token")), null);
  assert.equal(h.connections, 0);
  await h.auth.createSession("user-1", h.request(), h.response);
  const token = h.cookieWrites[0][1];
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(h.rows[0].tokenHash, crypto.createHash("sha256").update(token).digest("hex"));
  assert.ok(!JSON.stringify(h.rows).includes(token));
  assert.equal((await h.auth.getAuthUser(h.request(token))).id, "user-1");
});

test("expired records are rejected even if the database TTL has not removed them", async () => {
  const h = sessionHarness();
  await h.auth.createSession("user-1", h.request(), h.response);
  const token = h.cookieWrites[0][1];
  h.advance(20 * 60 * 1000);
  assert.equal(h.rows.length, 1);
  assert.equal(await h.auth.getAuthUser(h.request(token)), null);
  assert.equal(await h.auth.renewSession(h.request(token, "POST"), true), null);
});

test("polling never refreshes deadlines; warning requires explicit continuation", async () => {
  const h = sessionHarness();
  await h.auth.createSession("user-1", h.request(), h.response);
  const token = h.cookieWrites[0][1];
  const initial = h.rows[0].expiresAt.getTime();
  h.advance(19.5 * 60 * 1000);
  await h.auth.getAuthUser(h.request(token));
  assert.equal(h.rows[0].expiresAt.getTime(), initial);
  await h.auth.renewSession(h.request(token, "POST"), false);
  assert.equal(h.mutations, 0);
  await h.auth.renewSession(h.request(token, "POST"), true);
  assert.ok(h.rows[0].expiresAt.getTime() > initial);
  assert.equal(h.mutations, 1);
});

test("renewal cannot exceed 8 hours and replay after logout fails", async () => {
  const h = sessionHarness();
  await h.auth.createSession("user-1", h.request(), h.response);
  const token = h.cookieWrites[0][1];
  // Simulate earlier valid activity, keeping the absolute lifetime unchanged.
  h.rows[0].expiresAt = new Date(h.rows[0].absoluteExpiresAt);
  h.advance(8 * 60 * 60 * 1000 - 10_000);
  await h.auth.renewSession(h.request(token, "POST"), true);
  assert.equal(h.rows[0].expiresAt.getTime(), h.rows[0].absoluteExpiresAt.getTime());
  await h.auth.revokeSession(h.request(token, "POST"), h.response);
  assert.equal(await h.auth.getAuthUser(h.request(token)), null);
  assert.equal(h.cookieWrites.at(-1)[2].maxAge, 0);
});

test("unknown users and cross-origin mutations cannot use a valid session", async () => {
  const h = sessionHarness();
  await h.auth.createSession("user-1", h.request(), h.response);
  const token = h.cookieWrites[0][1];
  const req = h.request(token, "POST"); req.headers = headers("https://evil.example");
  const calls = h.connections;
  assert.equal(await h.auth.getAuthUser(req), null);
  assert.equal(h.connections, calls);
  h.removeUser();
  assert.equal(await h.auth.getAuthUser(h.request(token)), null);
});

test("creating a new session replaces the browser's previous identifier", async () => {
  const h = sessionHarness();
  await h.auth.createSession("user-1", h.request(), h.response);
  const first = h.cookieWrites[0][1];
  await h.auth.createSession("user-1", h.request(first), h.response);
  assert.equal(h.rows.length, 1);
  assert.notEqual(first, h.cookieWrites[1][1]);
  assert.equal(await h.auth.getAuthUser(h.request(first)), null);
});

test("login throttling is persisted, hashed, and shared across instances", async () => {
  const records = new Map();
  const limiter = load("lib/loginRateLimit.ts", {
    "node:crypto": crypto,
    "@/models/LoginAttempt": { __esModule: true, default: {
      findOneAndUpdate: ({ _id }, update) => ({ lean: async () => {
        const row = records.get(_id) ?? { attempts: 0, expiresAt: update.$setOnInsert?.expiresAt };
        row.attempts += 1;
        records.set(_id, row);
        return row;
      } }),
    } },
  });
  const req = { headers: new Headers() };
  for (let i = 0; i < 10; i++) assert.equal(await limiter.allowLoginAttempt(req, "private@example.invalid"), true);
  assert.equal(await limiter.allowLoginAttempt(req, "private@example.invalid"), false);
  assert.ok([...records.keys()].every((key) => /^[a-f0-9]{64}$/.test(key)));
  assert.ok(!JSON.stringify([...records]).includes("private@example.invalid"));
});

function loginHarness(userPresent = true, validPassword = true) {
  let connected = 0;
  let comparisons = 0;
  let created = 0;
  const makeResponse = (data = {}, message = "", status = 200) => Response.json({ success: status < 400, message, data }, { status });
  const route = load("app/api/auth/login/route.ts", {
    "@/lib/serverLogger": { logServerError: () => {} },
    "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
    bcryptjs: { __esModule: true, default: { compare: async () => { comparisons += 1; return validPassword; } } },
    "@/lib/mongodb": { __esModule: true, default: async () => { connected += 1; } },
    "@/lib/apiResponse": { successResponse: makeResponse, errorResponse: (message, status) => makeResponse({}, message, status) },
    "@/lib/auth": { createSession: async (id, req, response) => { created += 1; response.headers.set("set-cookie", "test-session=opaque; HttpOnly"); } },
    "@/lib/sessionPolicy": policy,
    "@/lib/loginRateLimit": { allowLoginAttempt: async () => true },
    "@/models/User": { __esModule: true, default: { findOne: async () => userPresent ? { _id: "user-1", name: "Example", email: "example@example.invalid", role: "admin", password: "test-hash" } : null } },
  });
  return { route, get connected() { return connected; }, get comparisons() { return comparisons; }, get created() { return created; } };
}

function loginRequest(body, origin = "https://crm.example") {
  return { method: "POST", url: "https://crm.example/api/auth/login", headers: headers(origin), json: async () => body };
}

test("login rejects cross-origin and object-injection payloads before connecting", async () => {
  const h = loginHarness();
  assert.equal((await h.route.POST(loginRequest({ email: "example@example.invalid", password: "password" }, "https://evil.example"))).status, 403);
  assert.equal((await h.route.POST(loginRequest({ email: { $ne: "" }, password: "password" }))).status, 401);
  assert.equal(h.connected, 0);
});

test("unknown and wrong-password users receive identical failures and both run bcrypt", async () => {
  const request = loginRequest({ email: "example@example.invalid", password: "password" });
  const missing = loginHarness(false, false);
  const wrong = loginHarness(true, false);
  const a = await missing.route.POST(request);
  const b = await wrong.route.POST(request);
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.equal(await a.text(), await b.text());
  assert.equal(missing.comparisons, 1);
  assert.equal(wrong.comparisons, 1);
});

test("successful login issues a cookie without returning a bearer token or password", async () => {
  const h = loginHarness();
  const response = await h.route.POST(loginRequest({ email: "example@example.invalid", password: "password" }));
  assert.equal(response.status, 200);
  assert.equal(h.created, 1);
  const body = await response.json();
  assert.equal(body.data.user.id, "user-1");
  assert.equal("token" in body.data, false);
  assert.equal("password" in body.data.user, false);
  assert.match(response.headers.get("set-cookie"), /HttpOnly/);
});
