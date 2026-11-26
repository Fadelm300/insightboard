import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as crypto from "node:crypto";
import bcrypt from "bcryptjs";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
function load(file, dependencies = {}, env = {}, logger = console) {
  const exports = {};
  const output = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(output, {
    exports, Buffer, TextDecoder, URL, console: logger, process: { env },
    require(name) {
      if (!(name in dependencies)) throw Error(`Unexpected import: ${name}`);
      return dependencies[name];
    },
  }, { filename: file });
  return exports;
}
const bounded = load("lib/boundedJson.ts");
const api = load("lib/apiResponse.ts", { "next/server": { NextResponse: { json: Response.json.bind(Response) } } });
const id = "a".repeat(24);
const routes = ["clients", "deals", "projects", "revenue", "expenses"].flatMap((resource) => [
  [`app/api/${resource}/route.ts`, "POST"], [`app/api/${resource}/[id]/route.ts`, "PUT"],
]);
routes.push(["app/api/deals/[id]/convert-to-project/route.ts", "POST"]);

function fixture(file, { denial, demo, databaseError } = {}) {
  let connected = 0;
  const logs = [];
  const logger = load("lib/serverLogger.ts", { "node:crypto": crypto }, {}, { error: (...args) => logs.push(args) });
  const dependencies = {
    "@/lib/boundedJson": bounded,
    "@/lib/apiResponse": api,
    "@/lib/serverLogger": logger,
    "@/lib/authorization": { authorizeRequest: async () => denial ? { response: api.errorResponse("Forbidden", 403) } : { user: { role: "admin" } } },
    "@/lib/demoMode": { blockIfDemoMode: () => demo ? api.errorResponse("View only", 403) : null },
    "@/lib/mongodb": { __esModule: true, default: async () => { connected++; throw databaseError ?? Error("Unexpected database access"); } },
    "@/lib/crmData": { canManageProjectFinancials: () => true },
    "@/lib/projectDealLink": { ProjectDealLinkUnavailable: class extends Error {}, isProjectDealConflict: () => false },
    mongoose: { Types: { ObjectId: { isValid: (value) => /^[a-f\d]{24}$/i.test(value) } } },
  };
  for (const match of read(file).matchAll(/(?:from|import) "(@\/[^\"]+)"/g)) {
    if (!(match[1] in dependencies)) dependencies[match[1]] = {};
  }
  return { route: load(file, dependencies), logs, get connected() { return connected; } };
}
function request(body, headers = {}) {
  return new Request("https://crm.example/api/test", { method: "POST", headers: { "content-type": "application/json", ...headers }, body });
}

for (const [file, method] of routes) {
  test(`${file}: bounded JSON rejects invalid streams before business database access and preserves access gates`, async () => {
    for (const [body, headers, expected] of [
      ["{}", { "content-length": String(bounded.CRM_JSON_MAX_BYTES + 1) }, 413],
      [JSON.stringify({ notes: "س".repeat(bounded.CRM_JSON_MAX_BYTES) }), { "content-length": "2" }, 413],
      ["{}", { "content-type": "text/plain" }, 415],
      ["{", {}, 400], ["[]", {}, 400],
    ]) {
      const f = fixture(file);
      const response = await f.route[method](request(body, headers), { params: Promise.resolve({ id }) });
      assert.equal(response.status, expected);
      assert.equal(f.connected, 0);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(f.logs.length, 0);
    }
    for (const options of [{ denial: true }, { demo: true }]) {
      const f = fixture(file, options);
      const req = request("x".repeat(bounded.CRM_JSON_MAX_BYTES + 1));
      assert.equal((await f.route[method](req, { params: Promise.resolve({ id }) })).status, 403);
      assert.equal(req.bodyUsed, false);
      assert.equal(f.connected, 0);
    }
  });
}

test("unknown-email comparison uses a valid precomputed bcrypt hash with the account-creation cost", async () => {
  const hash = read("app/api/auth/login/route.ts").match(/user\?\.password \?\? "([^"]+)"/)[1];
  assert.equal(bcrypt.getRounds(hash), 12);
  assert.equal(await bcrypt.compare("incorrect-test-password", hash), false);
});

test("safe logger classifies errors and emits unique server IDs without serializing sensitive values", () => {
  const logs = [];
  const logger = load("lib/serverLogger.ts", { "node:crypto": crypto }, {}, { error: (...args) => logs.push(args) });
  const ids = new Set();
  for (const [error, category] of [
    [Object.assign(Error("private-password"), { name: "MongoServerSelectionError" }), "database_unavailable"],
    [{ code: 11000, keyValue: { email: "private-email" } }, "database_conflict"],
    [{ name: "ValidationError", errors: { password: "private-password" } }, "database_validation"],
    [{ name: "TimeoutError" }, "timeout"], [new TypeError("private-token"), "programming_error"],
    ["private-secret", "unexpected"], [{ get name() { throw Error("private-secret"); } }, "unexpected"],
  ]) {
    const requestId = logger.logServerError("LOGIN_API_ERROR", error);
    assert.match(requestId, /^[0-9a-f-]{36}$/);
    assert.equal(logs.at(-1)[1].category, category);
    ids.add(requestId);
  }
  assert.equal(ids.size, logs.length);
  assert.doesNotMatch(JSON.stringify(logs), /private-|keyValue|stack|password/);
});

test("unexpected API failure correlates the generic private 500 response with one sanitized log", async () => {
  const f = fixture("app/api/clients/route.ts", { databaseError: Object.assign(Error("mongodb://private-secret@private-host"), { name: "MongoNetworkError" }) });
  const response = await f.route.GET(new Request("https://crm.example/api/clients"));
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-request-id"), f.logs[0][1].requestId);
  assert.equal(f.logs[0][1].category, "database_unavailable");
  assert.doesNotMatch(await response.text(), /private-|MongoNetworkError|stack/);
});

test("public sitemap omits application routes and unpublished legal drafts", () => {
  for (const mode of [undefined, "review"]) {
    const { default: sitemap } = load("app/sitemap.ts", {}, { LEGAL_NOTICE_MODE: mode });
    const paths = Array.from(sitemap(), (item) => new URL(item.url).pathname);
    assert.deepEqual(paths, mode === "review" ? ["/"] : ["/", "/privacy", "/terms"]);
  }
  const { default: robots } = load("app/robots.ts");
  assert.equal(robots().sitemap, "https://insightboard-one.vercel.app/sitemap.xml");
  assert.ok(robots().rules.disallow.includes("/dashboard"));
  assert.ok(robots().rules.disallow.includes("/api/"));
});

test("public pages have distinct canonical URLs while login and dashboard remain unindexed", async () => {
  const legalContent = load("components/landing/legalContent.ts").legalContent;
  function metadataModule(file, mode) {
    const dependencies = {
      "react/jsx-runtime": {},
      "next/headers": { cookies: async () => ({ get: () => ({ value: "en" }) }) },
      "./legalContent": { legalContent },
    };
    for (const match of read(file).matchAll(/(?:from|import) "([^"]+)"/g)) {
      if (!(match[1] in dependencies)) dependencies[match[1]] = {};
    }
    return load(file, dependencies, { LEGAL_NOTICE_MODE: mode });
  }
  assert.equal(metadataModule("app/layout.tsx").metadata.metadataBase.origin, "https://insightboard-one.vercel.app");
  assert.equal(metadataModule("app/page.tsx").metadata.alternates.canonical, "/");
  for (const page of ["app/login/page.tsx", "app/dashboard/layout.tsx"]) {
    assert.equal(metadataModule(page).metadata.robots.index, false);
  }
  for (const kind of ["privacy", "terms"]) {
    const live = await metadataModule("components/landing/LegalNotice.tsx").legalMetadata(kind);
    assert.equal(live.alternates.canonical, `/${kind}`);
    assert.equal(live.robots, undefined);
    const draft = await metadataModule("components/landing/LegalNotice.tsx", "review").legalMetadata(kind);
    assert.equal(draft.robots.index, false);
  }
  const cookie = await metadataModule("app/cookie-settings/page.tsx").generateMetadata();
  assert.equal(cookie.alternates.canonical, "/cookie-settings");
  assert.equal(cookie.robots.index, false);
});
