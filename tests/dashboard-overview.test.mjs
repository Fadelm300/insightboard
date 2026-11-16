import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function loadRoute(dependencies) {
  const path = "app/api/dashboard/overview/route.ts";
  const source = readFileSync(path, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: path,
  });
  const compiled = { exports: {} };
  new Function("require", "module", "exports", outputText)((key) => {
    assert.ok(Object.hasOwn(dependencies, key), `Missing fixture for ${key}`);
    return dependencies[key];
  }, compiled, compiled.exports);
  return compiled.exports.GET;
}

test("dashboard overview counts beyond a page and returns only the five display records", async () => {
  const seen = [];
  const recent = {
    select(fields) { assert.doesNotMatch(fields, /email|notes|description/); return this; },
    populate(key, fields) { assert.deepEqual([key, fields], ["clientId", "companyName"]); return this; },
    sort() { return this; },
    limit(size) { assert.equal(size, 5); return this; },
    lean() {
      return Array.from({ length: 5 }, (_, index) => ({
        _id: index, title: `Deal ${index}`, status: "Lead",
        clientId: { companyName: "QA", email: "private@example.test" },
      }));
    },
  };

  const route = loadRoute({
    "@/lib/apiResponse": { successResponse: (data) => ({ data }), errorResponse: () => assert.fail("Unexpected error") },
    "@/lib/authorization": { authorizeRequest: async (_, permission) => {
      assert.equal(permission, "dashboard.read");
      return { response: null };
    } },
    "@/lib/dashboardFinance": { readFinanceSummary: async () => ({ netProfit: 60 }), readMonthlyFinance: async () => [] },
    "@/lib/mongodb": async () => {},
    "@/lib/serverLogger": { logServerError: () => assert.fail("Unexpected server error") },
    "@/models/Client": { countDocuments: async (filter) => { seen.push(filter); return 120; } },
    "@/models/Deal": {
      aggregate: async ([match]) => { seen.push(match.$match); return [{ _id: "Lead", count: 30 }, { _id: "Closed Won", count: 20 }]; },
      find: (filter) => { seen.push(filter); return recent; },
    },
    "@/models/Project": {
      aggregate: async ([match]) => { seen.push(match.$match); return [{ _id: "In Progress", count: 65, pending: 55 }]; },
    },
  });

  const { data } = await route({});
  assert.deepEqual(seen, Array(4).fill({ isDeleted: { $ne: true } }));
  assert.equal(data.clientCount, 120);
  assert.equal(data.activeDealsCount, 30);
  assert.equal(data.pendingPaymentsCount, 55);
  assert.equal(data.dealStatusCounts["Closed Won"], 20);
  assert.equal(data.projectStatusCounts["In Progress"], 65);
  assert.equal(data.recentDeals.length, 5);
  assert.deepEqual(data.recentDeals[0].clientId, { companyName: "QA" });
});

test("dashboard overview denies access before connecting or reading any data", async () => {
  const denied = { status: 403 };
  const route = loadRoute({
    "@/lib/apiResponse": {},
    "@/lib/authorization": { authorizeRequest: async () => ({ response: denied }) },
    "@/lib/dashboardFinance": {},
    "@/lib/mongodb": () => assert.fail("Denied calls must not connect"),
    "@/lib/serverLogger": {},
    "@/models/Client": {},
    "@/models/Deal": {},
    "@/models/Project": {},
  });
  assert.equal(await route({}), denied);
});
