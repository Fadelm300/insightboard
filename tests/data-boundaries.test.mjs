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
  vm.runInNewContext(compiled, { exports, Buffer, URL, Date, Number, Object, require(name) {
    if (!(name in dependencies)) throw Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}
const permissions = load("lib/permissions.ts");
const data = load("lib/crmData.ts", { "@/lib/permissions": permissions });
const plain = (value) => JSON.parse(JSON.stringify(value));

test("CRM money preserves cents and rejects unsupported values", () => {
  for (const value of ["0x10", "1e3", "1.001", -1, Infinity, "9".repeat(400), "90071992547409.91", "90071992547409.92", true]) {
    assert.equal(data.parseCrmMoney(value), null, String(value));
  }
  assert.equal(data.parseCrmMoney(" 0012.30 "), 12.3);
  assert.equal(data.parseCrmMoney(0), 0);
});

for (const [resource, model, fields, payload] of [
  ["deals", "Deal", ["estimatedBudget", "finalPrice"], { title: "Test deal", estimatedBudget: 15, finalPrice: 0, status: "Lead", probability: 50 }],
  ["revenue", "Revenue", ["amount"], { amount: 15, paymentDate: "2024-01-01", paymentMethod: "Cash" }],
  ["expenses", "Expense", ["amount"], { title: "Test expense", amount: 15, date: "2024-01-01", category: "Other" }],
]) {
  test(`${resource} rejects invalid create and update amounts before writing`, async () => {
    const id = "a".repeat(24);
    let stored = { ...payload, _id: id, clientId: id, projectId: id };
    let writes = 0;
    const save = async (...args) => {
      writes++;
      stored = { ...stored, ...args.at(-1) };
      return stored;
    };
    const populate = (result) => ({ populate: () => populate(result), then: result.then.bind(result) });
    const repository = {
      findOne: async () => stored,
      findById: () => populate(Promise.resolve(stored)),
      create: save,
      findByIdAndUpdate: (_id, update) => populate(save(update)),
      findOneAndUpdate: (_query, update) => populate(save(update)),
    };
    const deps = {
    "@/lib/crmArchive": { archiveCrmRecord: async () => { throw Error("Unexpected archive"); } },
      "@/lib/financialArchive": { changeFinancialArchive: async () => { throw Error("Unexpected archive"); } },
      "@/lib/crmData": data, "@/lib/permissions": permissions,
      "@/lib/authorization": { authorizeRequest: async () => ({ user: { role: "admin" } }) },
      "@/lib/demoMode": { blockIfDemoMode: () => null },
      "@/lib/mongodb": async () => {},
      "@/lib/apiResponse": { errorResponse: (message, status) => ({ message, status }), successResponse: (body, message, status = 200) => ({ body, message, status }) },
      "@/models/Client": { findOne: async () => ({ _id: id }) },
      "@/models/Project": { findOne: async () => ({ _id: id, clientId: id }) },
      [`@/models/${model}`]: repository,
      mongoose: { Types: { ObjectId: { isValid: () => true } } },
    };
    const collection = load(`app/api/${resource}/route.ts`, deps);
    const item = load(`app/api/${resource}/[id]/route.ts`, deps);
    const context = { params: Promise.resolve({ id }) };
    for (const field of fields) {
      for (const value of [-1, "1.001", "9".repeat(400), "90071992547409.92"]) {
        const req = { json: async () => ({ ...stored, [field]: value }) };
        assert.equal((await collection.POST(req)).status, 400, `POST ${field}`);
        assert.equal((await item.PUT(req, context)).status, 400, `PUT ${field}`);
      }
    }
    assert.equal(writes, 0);
    assert.equal(stored[fields[0]], 15);
    const valid = { json: async () => ({ ...stored, [fields[0]]: "15.25" }) };
    assert.equal((await collection.POST(valid)).status, 201);
    assert.equal(stored[fields[0]], 15.25);
    const update = { json: async () => ({ ...stored, [fields[0]]: 16.75 }) };
    assert.equal((await item.PUT(update, context)).status, 200);
    assert.equal(stored[fields[0]], 16.75);
  });
}
const employee = { id: "a".repeat(24), role: "employee", allowedPermissions: ["projects.read", "projects.create", "projects.update", "settings.read"] };
const reader = { ...employee, allowedPermissions: [...employee.allowedPermissions, "projects.financial.read"] };
const writer = { ...reader, allowedPermissions: [...reader.allowedPermissions, "projects.financial.manage"] };
const project = { _id: "b".repeat(24), name: "QA project", type: "Business Website", status: "Not Started", price: 900, cost: 200, profit: 700, paymentStatus: "Unpaid", internalSecret: "never return",
  clientId: { _id: "c".repeat(24), companyName: "QA company", email: "private@example.test", contactPerson: "Private", password: "not-a-real-password" },
  dealId: { _id: "d".repeat(24), title: "QA deal", status: "Closed Won", finalPrice: 900, estimatedBudget: 800, privateField: "hidden" } };

test("project money uses separately delegated read and manage grants with dependencies", () => {
  assert.equal(data.canReadProjectFinancials(employee), false);
  assert.equal(data.canReadProjectFinancials(reader), true);
  assert.equal(data.canManageProjectFinancials(reader), false);
  assert.equal(data.canManageProjectFinancials(writer), true);
  assert.equal(permissions.hasPermission({ role: "employee", allowedPermissions: ["projects.financial.manage"] }, "projects.financial.manage"), false);
  assert.equal(permissions.canDelegatePermissions({ role: "manager" }, "employee", writer.allowedPermissions), true);
  assert.equal(permissions.canDelegatePermissions(employee, "employee", writer.allowedPermissions), false);
});

test("project DTO strips money, nested contacts, deal prices and unknown model fields", () => {
  const dto = plain(data.projectDTO(project, employee));
  for (const field of ["price", "cost", "profit", "paymentStatus", "internalSecret"]) assert.equal(field in dto, false);
  assert.deepEqual(dto.clientId, { _id: project.clientId._id, companyName: "QA company" });
  assert.deepEqual(dto.dealId, { _id: project.dealId._id, title: "QA deal", status: "Closed Won" });
  assert.equal(dto.name, project.name);
});

test("financial reader receives project money without gaining client contacts or deal budgets", () => {
  const dto = plain(data.projectDTO(project, reader));
  assert.equal(dto.price, 900); assert.equal(dto.profit, 700);
  assert.equal("email" in dto.clientId, false); assert.equal("finalPrice" in dto.dealId, false);
  const authorized = { ...reader, allowedPermissions: [...reader.allowedPermissions, "clients.read", "deals.read"] };
  const full = plain(data.projectDTO(project, authorized));
  assert.equal(full.clientId.email, "private@example.test"); assert.equal(full.dealId.finalPrice, 900);
  assert.equal("password" in full.clientId, false); assert.equal("privateField" in full.dealId, false);
});

test("DTO boundaries work with mongoose-like documents, null relations and raw ObjectIds", () => {
  const dto = data.projectDTO({ toObject: () => ({ ...project, clientId: null, dealId: undefined }) }, employee);
  assert.equal(dto.clientId, null); assert.equal(dto.dealId, undefined);
  const id = { toHexString: () => "e".repeat(24), toString: () => "e".repeat(24) };
  assert.equal(data.clientLabelDTO(id, employee), "e".repeat(24));
  assert.equal(data.clientLabelDTO({ email: "should-not-pass@example.test" }, employee), null);
});

test("revenue and expense relationships cannot smuggle client contacts or project-only fields", () => {
  const actor = { role: "employee", allowedPermissions: ["revenue.read", "expenses.read"] };
  const revenue = plain(data.revenueDTO({ _id: "r", amount: 25, projectId: project, clientId: project.clientId, hidden: true }, actor));
  assert.deepEqual(revenue.projectId, { _id: project._id, name: project.name });
  assert.equal("email" in revenue.clientId, false); assert.equal("hidden" in revenue, false);
  const expense = plain(data.expenseDTO({ _id: "x", amount: 20, projectId: project }, actor));
  assert.deepEqual(expense.projectId, revenue.projectId);
});

test("all serializers use positive field allowlists rather than forwarding document internals", () => {
  const source = { _id: "x", companyName: "QA", title: "QA", amount: 4, hidden: "secret", __v: 9, clientId: project.clientId, projectId: project };
  for (const serialize of [data.clientDTO, data.dealDTO, data.projectDTO, data.revenueDTO, data.expenseDTO]) {
    const dto = serialize(source, employee);
    assert.equal("hidden" in dto, false); assert.equal("__v" in dto, false);
  }
});

test("no-financial-write employee can create pending pricing but cannot submit hidden fields", () => {
  const result = data.projectFinancialInput(employee, { name: "QA project" });
  assert.deepEqual(plain(result.data), { price: null, cost: null, profit: null, paymentStatus: "Unpaid" });
  for (const field of ["price", "cost", "paymentStatus"]) {
    assert.equal(data.projectFinancialInput(employee, { [field]: field === "paymentStatus" ? "Unpaid" : 900 }).status, 403);
  }
  assert.equal(data.projectFinancialInput(reader, { price: 900 }).status, 403);
});

test("writer pricing is finite, positive, bounded and derived; server-owned fields are rejected", () => {
  assert.deepEqual(plain(data.projectFinancialInput(writer, { price: "900.50", cost: "200.25" }).data), { price: 900.5, cost: 200.25, profit: 700.25, paymentStatus: "Unpaid" });
  for (const price of ["9".repeat(400), Infinity, NaN, -1, 0, "1.123", Number.MAX_SAFE_INTEGER, { $gt: 0 }]) assert.equal(data.projectFinancialInput(writer, { price }).status, 400);
  for (const key of ["profit", "isDeleted", "authVersion", "$set", "ownerId"]) assert.equal(data.projectFinancialInput(writer, { [key]: 1 }).status, 400);
  assert.equal(data.projectFinancialInput(writer, { cost: 20 }).status, 400);
  assert.equal(data.projectFinancialInput(writer, { price: null }, project).status, 400);
  assert.equal(data.projectFinancialInput(writer, { notes: { $set: "injected" } }).status, 400);
  assert.equal(data.projectFinancialInput(employee, { name: false }).status, 400);
});

test("project schema accepts explicit pending pricing and rejects non-finite stored amounts", async () => {
  const { default: mongoose } = await import("mongoose");
  const Model = load("models/Project.ts", { mongoose }).default;
  const pending = new Model({ clientId: "a".repeat(24), name: "Pending QA" });
  assert.equal(pending.price, null); assert.equal(pending.cost, null); assert.equal(pending.profit, null);
  await pending.validate();
  for (const value of [Infinity, NaN, Number.MAX_SAFE_INTEGER, -1]) {
    const invalid = new Model({ clientId: "a".repeat(24), name: "Invalid QA", price: value });
    await assert.rejects(invalid.validate(), (error) => !!error.errors?.price);
  }
  const invalidCost = new Model({ clientId: "a".repeat(24), name: "Invalid QA", price: 100, cost: Infinity });
  await assert.rejects(invalidCost.validate(), (error) => !!error.errors?.cost);
});

test("pending money remains distinguishable from zero in report display and exports", () => {
  const format = load("app/dashboard/reports/_lib/reportUtils.ts");
  assert.equal(format.formatMoney(null), "Pending pricing");
  assert.equal(format.formatNumber(null), "Pending pricing");
  assert.equal(format.formatPercent(null), "Pending pricing");
  assert.equal(format.formatMoney(0), "0.00 BHD");
});

function routeFixture(actor, options = {}) {
  const calls = { writes: 0, filters: [], clientQueries: [], dealQueries: 0, updates: [] };
  let stored = { ...project, clientId: project.clientId._id, dealId: null };
  function chain(value) {
    return { populate(field) {
      const addRelation = (row) => ({ ...row, [field]: field === "clientId" ? project.clientId : field === "dealId" ? project.dealId : row[field] });
      value = Array.isArray(value) ? value.map(addRelation) : addRelation(value);
      return this;
    }, sort() { return this; }, skip() { return this; }, limit() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } };
  }
  const Project = {
    find(filter) { calls.filters.push(filter); return chain([stored]); },
    countDocuments: async () => 1,
    findOne: () => chain(stored),
    create: async (payload) => { calls.writes++; stored = { ...payload, _id: project._id }; return stored; },
    findOneAndUpdate(_filter, update) { calls.writes++; calls.updates.push(update); stored = { ...stored, ...update.$set }; return chain(stored); },
  };
  const deps = {
    "@/lib/crmArchive": { archiveCrmRecord: async () => { throw Error("Unexpected archive"); } },
    "@/lib/permissions": permissions, "@/lib/crmData": data,
    "@/lib/projectDealLink": { ensureProjectDealIndex: async () => {}, isProjectDealConflict: () => false, ProjectDealLinkUnavailable: class extends Error {} },
    "@/lib/authorization": { authorizeRequest: async (_req, permission) => permissions.hasPermission(actor, permission) ? { user: actor } : { response: { status: 403 } } },
    "@/lib/mongodb": { __esModule: true, default: async () => {} },
    "@/lib/demoMode": { blockIfDemoMode: () => null },
    "@/lib/apiResponse": { successResponse: (body, message, status = 200) => ({ status, data: body, message }), errorResponse: (message, status) => ({ status, message }) },
    "@/models/Project": { __esModule: true, default: Project },
    "@/models/Client": { __esModule: true, default: { find: (query) => { calls.clientQueries.push(query); return { select: async () => [] }; }, findOne: async () => ({ _id: project.clientId._id }) } },
    "@/models/Deal": { __esModule: true, default: { find: () => { calls.dealQueries++; return { select: async () => [] }; } } },
    mongoose: { Types: { ObjectId: { isValid: (id) => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id) } } },
  };
  return { collection: load("app/api/projects/route.ts", deps), item: load("app/api/projects/[id]/route.ts", deps), conversion: load("app/api/deals/[id]/convert-to-project/route.ts", deps), calls, get stored() { return stored; }, options };
}

test("real project handlers filter list and item responses instead of leaking populated documents", async () => {
  const f = routeFixture(employee);
  const list = await f.collection.GET({ url: "http://localhost/api/projects" });
  const item = await f.item.GET({}, { params: Promise.resolve({ id: project._id }) });
  assert.equal(list.status, 200); assert.equal(item.status, 200);
  assert.equal("cost" in list.data.projects[0], false); assert.equal("profit" in item.data.project, false);
  assert.equal("email" in item.data.project.clientId, false);
});

test("project search cannot test hidden money, payment state, contacts or unauthorized deal fields", async () => {
  const f = routeFixture(employee);
  await f.collection.GET({ url: "http://localhost/api/projects?search=200" });
  const text = JSON.stringify(f.calls.filters);
  for (const field of ["price", "cost", "profit", "paymentStatus"]) assert.equal(text.includes(`\"${field}\"`), false);
  assert.equal(f.calls.dealQueries, 0);
  assert.equal(JSON.stringify(f.calls.clientQueries).includes("email"), false);
});

test("project create rejects hidden financial fields before relationship reads or writes", async () => {
  const f = routeFixture(employee);
  const result = await f.collection.POST({ json: async () => ({ name: "QA", price: 900 }) });
  assert.equal(result.status, 403); assert.equal(f.calls.writes, 0);
});

test("employee can create an unpriced project and the mutation response stays filtered", async () => {
  const f = routeFixture(employee);
  const result = await f.collection.POST({ json: async () => ({ name: "New QA", type: "Business Website", clientId: project.clientId._id }) });
  assert.equal(result.status, 201); assert.equal(f.calls.writes, 1);
  assert.equal(f.stored.price, null); assert.equal(f.stored.cost, null);
  assert.equal("price" in result.data.project, false); assert.equal("profit" in result.data.project, false);
});

test("non-financial project update does not rewrite old financial values and rejects attempted overrides", async () => {
  const f = routeFixture(employee);
  const result = await f.item.PUT({ json: async () => ({ name: "Updated QA" }) }, { params: Promise.resolve({ id: project._id }) });
  assert.equal(result.status, 200);
  for (const field of ["price", "cost", "profit", "paymentStatus"]) assert.equal(field in f.calls.updates[0].$set, false);
  assert.equal(f.stored.price, 900); assert.equal("price" in result.data.project, false);
  const denied = await f.item.PUT({ json: async () => ({ cost: 0 }) }, { params: Promise.resolve({ id: project._id }) });
  assert.equal(denied.status, 403); assert.equal(f.calls.writes, 1);
});

test("financial writer can price a project and a financial reader still cannot change it", async () => {
  const f = routeFixture(writer);
  const result = await f.item.PUT({ json: async () => ({ price: "950", cost: "250" }) }, { params: Promise.resolve({ id: project._id }) });
  assert.equal(result.status, 200); assert.equal(result.data.project.price, 950); assert.equal(result.data.project.profit, 700);
  const readOnly = routeFixture(reader);
  const denied = await readOnly.item.PUT({ json: async () => ({ price: 1 }) }, { params: Promise.resolve({ id: project._id }) });
  assert.equal(denied.status, 403); assert.equal(readOnly.calls.writes, 0);
});

test("deal conversion cannot assign project pricing without the independent financial manage permission", async () => {
  const actor = { role: "employee", allowedPermissions: permissions.withPermissionDependencies(["deals.convert"]) };
  const f = routeFixture(actor);
  const result = await f.conversion.POST({ json: async () => ({}) }, { params: Promise.resolve({ id: project.dealId._id }) });
  assert.equal(result.status, 403); assert.equal(f.calls.writes, 0);
});

for (const [resource, modelName] of [["revenue", "Revenue"], ["expenses", "Expense"]]) {
  test(`${resource} searches only project labels when project and finance reads are not granted`, async () => {
    const queries = [];
    const actor = { role: "employee", allowedPermissions: [`${resource}.read`] };
    const rows = { populate() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; }, then(resolve, reject) { return Promise.resolve([]).then(resolve, reject); } };
    const deps = {
    "@/lib/crmArchive": { archiveCrmRecord: async () => { throw Error("Unexpected archive"); } },
      "@/lib/permissions": permissions, "@/lib/crmData": data,
    "@/lib/projectDealLink": { ensureProjectDealIndex: async () => {}, isProjectDealConflict: () => false, ProjectDealLinkUnavailable: class extends Error {} },
      "@/lib/authorization": { authorizeRequest: async () => ({ user: actor }) },
      "@/lib/mongodb": { __esModule: true, default: async () => {} },
      "@/lib/demoMode": { blockIfDemoMode: () => null },
      "@/lib/apiResponse": { successResponse: (body) => ({ status: 200, data: body }), errorResponse: (_message, status) => ({ status }) },
      "@/models/Project": { __esModule: true, default: { find: (query) => { queries.push(query); return { select: async () => [] }; } } },
      "@/models/Client": { __esModule: true, default: { find: () => ({ select: async () => [] }) } },
      [`@/models/${modelName}`]: { __esModule: true, default: { find: () => rows, countDocuments: async () => 0 } },
      mongoose: { Types: {} },
    };
    const route = load(`app/api/${resource}/route.ts`, deps);
    assert.equal((await route.GET({ url: `http://localhost/api/${resource}?search=Paid` })).status, 200);
    const query = JSON.stringify(queries);
    assert.ok(query.includes('"name"'));
    for (const field of ["type", "status", "paymentStatus"]) assert.equal(query.includes(`"${field}"`), false);
  });
}
