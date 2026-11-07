import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
function load(file, deps) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, URL, Date, Object, Number, require(name) {
    if (!(name in deps)) throw Error(`Unexpected dependency: ${name}`);
    return deps[name];
  } });
  return exports;
}
const id = "a".repeat(24), clientId = "b".repeat(24);
const plain = (value) => JSON.parse(JSON.stringify(value));
const query = (fn) => ({ populate() { return this; }, then(resolve, reject) { return Promise.resolve().then(fn).then(resolve, reject); } });
function setup(options = {}) {
  const rows = [...(options.rows || [])];
  const calls = { index: [], writes: 0, deletes: 0 };
  let indexEnabled = false;
  const duplicate = () => Object.assign(new Error("synthetic index conflict"), { code: 11000, keyPattern: { dealId: 1 } });
  const Project = {
    collection: { createIndex: async (keys, config) => {
      calls.index.push(plain({ keys, config }));
      if (options.indexError) throw options.indexError;
      indexEnabled = true;
      return config.name;
    } },
    findOne: (filter) => query(() => rows.find((row) => filter.dealId
      ? row.dealId === filter.dealId && (!filter.isDeleted || !row.isDeleted)
      : row._id === filter._id && !row.isDeleted) || null),
    create: async (payload) => {
      await Promise.resolve();
      if (options.writeError) throw options.writeError;
      if (indexEnabled && payload.dealId && rows.some((r) => r.dealId === payload.dealId)) throw duplicate();
      const row = { _id: (rows.length + 1).toString(16).padStart(24, "0"), ...payload };
      rows.push(row); calls.writes++;
      return row;
    },
    findOneAndUpdate: (filter, update) => query(() => {
      const row = rows.find((r) => r._id === filter._id && !r.isDeleted);
      if (!row) return null;
      const next = { ...row, ...update.$set };
      if (indexEnabled && next.dealId && rows.some((r) => r._id !== row._id && r.dealId === next.dealId)) throw duplicate();
      Object.assign(row, next); calls.writes++;
      return row;
    }),
  };
  const link = load("lib/projectDealLink.ts", { "@/models/Project": { __esModule: true, default: Project } });
  const permissions = load("lib/permissions.ts", {});
  const data = load("lib/crmData.ts", { "@/lib/permissions": permissions });
  const actor = options.actor || { id: "c".repeat(24), role: "manager" };
  const deal = { _id: id, clientId, title: "Synthetic won deal", status: "Closed Won", finalPrice: 900 };
  const deps = {
    "@/lib/crmArchive": { archiveCrmRecord: async () => { throw Error("Unexpected archive"); } },
    "@/lib/projectDealLink": link,
    "@/lib/crmData": data,
    "@/lib/permissions": permissions,
    "@/lib/authorization": { authorizeRequest: async (_req, capability) => permissions.hasPermission(actor, capability) ? { user: actor } : { response: { status: 403 } } },
    "@/lib/demoMode": { blockIfDemoMode: () => null },
    "@/lib/mongodb": { __esModule: true, default: async () => {} },
    "@/lib/apiResponse": { errorResponse: (message, status) => ({ message, status }), successResponse: (data, message, status = 200) => ({ data, message, status }) },
    "@/models/Project": { __esModule: true, default: Project },
    "@/models/Deal": { __esModule: true, default: { findOne: async () => deal } },
    "@/models/Client": { __esModule: true, default: { findOne: async () => ({ _id: clientId }) } },
    mongoose: { Types: { ObjectId: { isValid: (value) => /^[a-f\d]{24}$/i.test(String(value)) } } },
  };
  return { rows, calls, link, conversion: load("app/api/deals/[id]/convert-to-project/route.ts", deps),
    projects: load("app/api/projects/route.ts", deps), item: load("app/api/projects/[id]/route.ts", deps) };
}
const request = (body = {}) => ({ json: async () => body });
const context = (value = id) => ({ params: Promise.resolve({ id: value }) });
const payload = () => ({ clientId, dealId: id, name: "Synthetic project", type: "Business Website", price: 900, cost: 0 });

test("database deal constraint is shared, partial only for ObjectIds, and includes soft-deleted projects", async () => {
  const s = setup();
  await Promise.all(Array.from({ length: 12 }, () => s.link.ensureProjectDealIndex()));
  assert.equal(s.calls.index.length, 1);
  assert.deepEqual(s.calls.index[0], { keys: { dealId: 1 }, config: { name: "unique_project_deal_link", unique: true, partialFilterExpression: { dealId: { $type: "objectId" } } } });
});

test("failed index verification fails closed, hides database error details and allows a later retry", async () => {
  const s = setup({ indexError: new Error("private credentials and duplicate data") });
  for (let i = 0; i < 2; i++) {
    await assert.rejects(s.link.ensureProjectDealIndex(), (error) => error instanceof s.link.ProjectDealLinkUnavailable && !error.message.includes("private"));
  }
  assert.equal(s.calls.index.length, 2);
  const response = await s.conversion.POST(request(), context());
  assert.equal(response.status, 503); assert.equal(s.rows.length, 0); assert.equal(s.calls.writes, 0);
});

test("duplicate classification does not disguise unrelated unique-key errors", () => {
  const { link } = setup();
  assert.equal(link.isProjectDealConflict({ code: 11000, keyPattern: { dealId: 1 } }), true);
  assert.equal(link.isProjectDealConflict({ code: 11000, message: "index unique_project_deal_link" }), true);
  for (const error of [null, "error", { code: 11000 }, { code: 11000, keyPattern: { _id: 1 } }, { code: 42, keyPattern: { dealId: 1 } }]) assert.equal(link.isProjectDealConflict(error), false);
});

test("simultaneous conversion requests produce one project and safe conflicts for all other requests", async () => {
  const s = setup();
  const responses = await Promise.all(Array.from({ length: 16 }, () => s.conversion.POST(request(), context())));
  assert.equal(responses.filter((r) => r.status === 201).length, 1);
  assert.equal(responses.filter((r) => r.status === 409).length, 15);
  assert.equal(s.rows.length, 1); assert.equal(s.calls.writes, 1);
});

test("an archived project blocks reconversion without being deleted or recreated", async () => {
  const archived = { _id: "d".repeat(24), dealId: id, isDeleted: true };
  const s = setup({ rows: [archived] });
  const result = await s.conversion.POST(request(), context());
  assert.equal(result.status, 409); assert.equal(s.rows.length, 1); assert.equal(s.rows[0].isDeleted, true); assert.equal(s.calls.writes, 0);
});

test("manual project creation racing conversion uses the same database uniqueness boundary", async () => {
  const s = setup();
  const results = await Promise.all([s.projects.POST(request(payload())), s.conversion.POST(request(), context())]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(s.rows.length, 1);
});

test("manual linking cannot reuse a deal reserved by a soft-deleted project", async () => {
  const s = setup({ rows: [{ _id: "d".repeat(24), dealId: id, isDeleted: true }] });
  const result = await s.projects.POST(request(payload()));
  assert.equal(result.status, 409); assert.equal(s.rows.length, 1);
});

test("updating a different project to an already-linked deal fails atomically", async () => {
  const target = "e".repeat(24);
  const s = setup({ rows: [{ _id: "d".repeat(24), dealId: id }, { _id: target, clientId, name: "Other", type: "Business Website", price: 200, cost: 0, status: "Not Started" }] });
  const result = await s.item.PUT(request({ dealId: id }), context(target));
  assert.equal(result.status, 409); assert.equal(s.rows[1].dealId, undefined); assert.equal(s.calls.writes, 0);
});

test("unlinked projects remain allowed without requiring a unique deal value", async () => {
  const s = setup();
  const body = payload(); delete body.dealId;
  const results = await Promise.all([s.projects.POST(request(body)), s.projects.POST(request(body))]);
  assert.equal(results.filter((r) => r.status === 201).length, 2); assert.equal(s.rows.length, 2); assert.equal(s.calls.index.length, 0);
});

test("unrelated write failures remain generic server failures", async () => {
  const s = setup({ writeError: Object.assign(new Error("private database detail"), { code: 11000, keyPattern: { _id: 1 } }) });
  const result = await s.conversion.POST(request(), context());
  assert.equal(result.status, 500); assert.equal(result.message, "Server error");
});

test("financially unauthorized conversion cannot build indexes or write a project", async () => {
  const s = setup({ actor: { role: "employee", allowedPermissions: ["deals.read", "projects.read", "projects.create", "deals.convert"] } });
  assert.equal((await s.conversion.POST(request(), context())).status, 403);
  assert.equal(s.calls.index.length, 0); assert.equal(s.calls.writes, 0);
});
