import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
function load(relative, dependencies = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, relative), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, Buffer, URL, Request,
    require(name) {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename: relative });
  return exports;
}
const permissions = load("lib/permissions.ts");
const employee = { role: "employee", allowedPermissions: ["projects.read", "projects.create", "settings.read"] };

test("legacy admin retains access without mutating existing account fields", () => {
  const user = Object.freeze({ role: "admin" });
  assert.equal(permissions.getPermissions(user).length, permissions.PERMISSIONS.length);
  assert.deepEqual(Object.keys(user), ["role"]);
  assert.equal(permissions.getPermissions({ role: "manager" }).includes("users.manage"), true);
});

test("project employee cannot read finance, delete records, export reports or manage users", () => {
  assert.equal(permissions.hasPermission(employee, "projects.create"), true);
  for (const capability of ["finance.read", "projects.delete", "users.manage", "reports.export", "dashboard.read"]) {
    assert.equal(permissions.hasPermission(employee, capability), false, capability);
  }
  assert.equal(permissions.firstAllowedPage(employee), "/dashboard/projects");
});

test("disabled, unknown and reserved roles deny access even with forged grants", () => {
  for (const role of ["programmer", "demo", "unknown", "__proto__", "constructor"]) {
    assert.equal(permissions.getPermissions({ role, allowedPermissions: [...permissions.PERMISSIONS] }).length, 0);
  }
  assert.equal(permissions.getPermissions({ role: "admin", isActive: false }).length, 0);
  assert.equal(permissions.getPermissions({ role: "employee", allowedPermissions: "projects.read" }).length, 0);
});

test("role ceilings and transitive read dependencies cannot be bypassed", () => {
  const forged = { role: "employee", allowedPermissions: [...permissions.PERMISSIONS] };
  for (const capability of ["users.manage", "system.diagnose", "projects.delete"]) {
    assert.equal(permissions.hasPermission(forged, capability), false);
  }
  assert.equal(permissions.hasPermission({ role: "employee", allowedPermissions: ["projects.create"] }, "projects.create"), false);
  const grants = permissions.withPermissionDependencies(["reports.export"]);
  assert.ok(grants.includes("finance.read"));
  assert.ok(grants.includes("expenses.read"));
  assert.ok(grants.includes("reports.read"));
  assert.equal(permissions.hasPermission({ role: "employee", allowedPermissions: grants }, "reports.print"), false);
});

test("delegation is bounded by actor grants and protected accounts cannot be assigned", () => {
  const manager = { role: "manager" };
  assert.equal(permissions.canDelegatePermissions(manager, "employee", employee.allowedPermissions), true);
  for (const role of ["manager", "admin", "programmer", "administration", "demo"]) {
    assert.equal(permissions.canDelegatePermissions(manager, role, []), false);
  }
  assert.equal(permissions.canDelegatePermissions({ ...manager, allowedPermissions: ["users.read", "users.manage"] }, "employee", ["finance.read"]), false);
  assert.equal(permissions.hasPermission({ role: "administration" }, "users.manage"), false);
});

test("request authorization distinguishes missing identity, CSRF and resource denial", async () => {
  let user = null, trusted = true, lookups = 0;
  const authorization = load("lib/authorization.ts", {
    "next/server": { NextResponse: { redirect: (url) => ({ status: 307, location: url.href }) } },
    "next/navigation": { redirect() { throw new Error("redirect"); } },
    "@/lib/auth": { getAuthUser: async () => { lookups++; return user; }, getCurrentUser: async () => user },
    "@/lib/permissions": permissions,
    "@/lib/apiResponse": { errorResponse: (message, status) => ({ message, status }) },
    "@/lib/sessionPolicy": { isTrustedMutation: () => trusted },
  });
  assert.equal((await authorization.authorizeRequest({}, "projects.read")).response.status, 401);
  trusted = false;
  assert.equal((await authorization.authorizeRequest({}, "projects.read")).response.status, 403);
  assert.equal(lookups, 1);
  trusted = true; user = employee;
  assert.equal((await authorization.authorizeRequest({}, "finance.read")).response.status, 403);
  assert.equal((await authorization.authorizeRequest({}, "projects.create")).response, null);
});

// Execute every real business handler: denied requests must stop before database work.
const resourceRoutes = ["clients", "deals", "projects", "revenue", "expenses"];
const routeCases = [];
for (const resource of resourceRoutes) {
  routeCases.push([`app/api/${resource}/route.ts`, { GET: `${resource}.read`, POST: `${resource}.create` }]);
  routeCases.push([`app/api/${resource}/[id]/route.ts`, { GET: `${resource}.read`, PUT: `${resource}.update`, DELETE: `${resource}.delete` }]);
}
routeCases.push(["app/api/deals/[id]/convert-to-project/route.ts", { POST: "deals.convert" }]);
for (const endpoint of ["clients", "monthly", "project-types", "projects", "projects/[id]", "summary"]) {
  routeCases.push([`app/api/finance/${endpoint}/route.ts`, { GET: "finance.read" }]);
}

test("report commands independently require print/export permissions on the server", async () => {
  const calls = [];
  const route = load("app/api/reports/authorize/route.ts", {
    "@/lib/authorization": { authorizeRequest: async (_req, permission) => { calls.push(permission); return { response: { status: 403 } }; } },
    "@/lib/apiResponse": { errorResponse: (_message, status) => ({ status }), successResponse: () => ({ status: 200 }) },
  });
  assert.equal((await route.POST({ url: "https://crm.example/api/reports/authorize?action=print" })).status, 403);
  assert.equal(calls.at(-1), "reports.print");
  assert.equal((await route.POST({ url: "https://crm.example/api/reports/authorize?action=export" })).status, 403);
  assert.equal(calls.at(-1), "reports.export");
  assert.equal((await route.POST({ url: "https://crm.example/api/reports/authorize?action=unknown" })).status, 400);
});

for (const [file, expected] of routeCases) {
  test(`${file} stops denied actions before data access`, async () => {
    const calls = [];
    const denial = { status: 403 };
    const deps = {
      "@/lib/authorization": { authorizeRequest: async (_req, capability) => { calls.push(capability); return { response: denial }; } },
      "@/lib/mongodb": { __esModule: true, default() { throw new Error("Database must not be called"); } },
      "@/lib/apiResponse": { errorResponse: (message, status) => ({ message, status }), successResponse() { throw new Error("Unexpected success"); } },
      "@/lib/demoMode": { blockIfDemoMode: () => null },
      "@/lib/serverLogger": { logServerError() {} },
      mongoose: { __esModule: true, default: { Types: { ObjectId: { isValid: () => true } } } },
    };
    const source = fs.readFileSync(path.join(root, file), "utf8");
    for (const match of source.matchAll(/(?:from|import) ["'](@\/[^"']+)["']/g)) {
      if (!(match[1] in deps)) deps[match[1]] = { __esModule: true, default: {} };
    }
    const route = load(file, deps);
    for (const [method, capability] of Object.entries(expected)) {
      if (!route[method]) continue; // Some item routes intentionally have no GET.
      assert.equal(await route[method]({ url: "https://crm.example/api/test" }, { params: Promise.resolve({ id: "a".repeat(24) }) }), denial);
      assert.equal(calls.at(-1), capability);
    }
  });
}

test("denied document navigation opens the access page while API clients keep JSON errors", async () => {
  let user = employee;
  const authorization = load("lib/authorization.ts", {
    "next/server": { NextResponse: { redirect: (url) => ({ status: 307, location: url.href }) } },
    "next/navigation": { redirect() { throw new Error("redirect"); } },
    "@/lib/auth": { getAuthUser: async () => user, getCurrentUser: async () => user },
    "@/lib/permissions": permissions,
    "@/lib/apiResponse": { errorResponse: (message, status) => ({ message, status }) },
    "@/lib/sessionPolicy": { isTrustedMutation: () => true },
  });
  const documentRequest = {
    method: "GET",
    url: "http://localhost:3000/api/financial-archive/revenue",
    headers: { get: (name) => ({ "sec-fetch-mode": "navigate", "sec-fetch-dest": "document" })[name] ?? null },
  };
  const denied = await authorization.authorizeRequest(documentRequest, "financialArchive.read");
  assert.equal(denied.response.location, "http://localhost:3000/access-denied");
  assert.equal(denied.response.status, 307);
  const apiRequest = { ...documentRequest, headers: { get: () => null } };
  const apiDenied = await authorization.authorizeRequest(apiRequest, "financialArchive.read");
  assert.equal(apiDenied.response.status, 403);
  assert.equal(apiDenied.response.message, "Forbidden");
  user = null;
  const expired = await authorization.authorizeRequest(documentRequest, "financialArchive.read");
  assert.equal(expired.response.location, "http://localhost:3000/login?reason=session-expired");
  const apiExpired = await authorization.authorizeRequest(apiRequest, "financialArchive.read");
  assert.equal(apiExpired.response.status, 401);
});

test("protected pages deny on the server before the isolated access navigation", async () => {
  let user = employee;
  const authorization = load("lib/authorization.ts", {
    "next/server": {},
    "next/navigation": { redirect: (url) => { throw new Error("REDIRECT " + url); } },
    "@/lib/auth": { getAuthUser: async () => user, getCurrentUser: async () => user },
    "@/lib/permissions": permissions,
    "@/lib/apiResponse": { errorResponse: (message, status) => ({ message, status }) },
    "@/lib/sessionPolicy": { isTrustedMutation: () => true },
  });
  const deniedPage = await authorization.authorizePage("financialArchive.read");
  assert.equal(deniedPage.allowed, false);
  assert.equal(deniedPage.home, "/dashboard/projects");
  const permitted = await authorization.authorizePage("projects.read");
  assert.equal(permitted.allowed, true);
  assert.equal(permitted.home, "/dashboard/projects");
  user = null;
  await assert.rejects(authorization.authorizePage("projects.read"), /REDIRECT \/login/);
});


test("CRM archive page is limited to archive readers and remains outside delegated role ceilings", () => {
  assert.equal(permissions.PAGE_PERMISSIONS["/dashboard/crm-archive"], "crmArchive.read");
  assert.equal(permissions.firstAllowedPage({ role: "admin", allowedPermissions: ["crmArchive.read"] }), "/dashboard/crm-archive");
  for (const role of ["manager", "administration", "senior", "employee", "viewer", "programmer"]) {
    assert.equal(permissions.hasPermission({ role, allowedPermissions: ["crmArchive.read", "crmArchive.restore"] }, "crmArchive.read"), false, role);
  }
  assert.equal(permissions.hasPermission({ role: "admin", allowedPermissions: ["crmArchive.read"] }, "crmArchive.restore"), false);
});
