import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { buildInvestorDemo } from "../scripts/investor-demo-data.mjs";
import { validateInvestorTarget } from "../scripts/provision-investor-demo.mjs";
import { getPermissions } from "../lib/permissions.ts";

const require = createRequire(import.meta.url);

function loadModel(name) {
  const file = new URL(`../models/${name}.ts`, import.meta.url);
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const exports = {};
  Function("exports", "require", outputText)(exports, require);
  return exports.default;
}

const data = buildInvestorDemo(new Date("2026-11-18T09:00:00Z"));

test("presentation provisioning accepts the explicitly selected Atlas database and existing account", () => {
  assert.equal(validateInvestorTarget("mongodb+srv://existing_app:password@example.test/insightboard_presentation", "insightboard_presentation"), "insightboard_presentation");
  for (const target of [
    undefined,
    "mongodb+srv://insightboard_investor_seed:password@example.test/insightboard",
    "mongodb+srv://example.test/insightboard_presentation",
    "mongodb+srv://insightboard_investor_seed:password@example.test/",
  ]) assert.throws(() => validateInvestorTarget(target, "insightboard_presentation"));
  for (const database of [undefined, "", "admin", "config", "local", "bad/name"]) {
    assert.throws(() => validateInvestorTarget("mongodb+srv://existing_app:password@example.test/insightboard_presentation", database));
  }
});

test("one manager has ten read-only accounts and no plain-text passwords in sample data", () => {
  assert.equal(data.users.length, 11);
  const manager = data.users.find(({ role }) => role === "manager");
  assert.equal(data.users.filter(({ managedBy }) => managedBy?.equals(manager._id)).length, 10);
  assert.equal(new Set(data.users.map(({ email }) => email)).size, 11);
  for (const user of data.users) {
    const permissions = getPermissions(user);
    assert.ok(permissions.includes("dashboard.read"));
    assert.ok(permissions.every((permission) => permission.endsWith(".read")));
    assert.equal("password" in user, false);
  }
});

test("demo records match their schemas and include five eligible deal conversions", async () => {
  const modelNames = ["Client", "Deal", "Project", "Revenue", "Expense"];
  for (const name of modelNames) {
    const Model = loadModel(name);
    await Promise.all(data[Model.collection.name].map((record) => new Model(record).validate()));
  }
  assert.deepEqual([data.clients.length, data.deals.length, data.projects.length], [10, 30, 50]);
  const clientIds = new Set(data.clients.map(({ _id }) => String(_id)));
  const deals = new Map(data.deals.filter(({ _id }) => _id).map((deal) => [String(deal._id), deal]));
  const links = data.projects.filter(({ dealId }) => dealId);
  assert.equal(new Set(links.map(({ dealId }) => String(dealId))).size, 10);
  for (const project of data.projects) {
    assert.ok(clientIds.has(String(project.clientId)));
    if (project.dealId) assert.ok(deals.get(String(project.dealId)).clientId.equals(project.clientId));
  }
  assert.equal(data.deals.filter(({ status, _id }) => status === "Closed Won" && !links.some(({ dealId }) => dealId.equals(_id))).length, 5);
  assert.equal(new Set(data.deals.map(({ status }) => status)).size, 6);
  assert.equal(new Set(data.projects.map(({ status }) => status)).size, 5);
  assert.equal(data.projects.filter(({ price }) => price === null).length, 2);
});

test("finance fixtures tie payments to the same client and cover overpayments", () => {
  const projects = new Map(data.projects.map((project) => [String(project._id), project]));
  assert.equal(data.revenues.length, 30);
  assert.equal(data.expenses.length, 40);
  for (const revenue of data.revenues) {
    assert.ok(projects.get(String(revenue.projectId)).clientId.equals(revenue.clientId));
  }
  for (const expense of data.expenses) {
    assert.equal(projects.get(String(expense.projectId)).cost, expense.amount);
  }
  assert.ok(data.revenues.some(({ projectId, amount }) => {
    const project = projects.get(String(projectId));
    return amount > project.price;
  }));
});
