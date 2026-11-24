import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
function load(file, deps = {}) {
  const exports = {};
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(compiled, { exports, URL, URLSearchParams, Buffer, Date, Number, Object, require(name) {
    if (!(name in deps)) throw Error(`Unexpected dependency: ${name}`);
    return deps[name];
  } });
  return exports;
}
const permissions = load("lib/permissions.ts");
const data = load("lib/crmData.ts", { "@/lib/permissions": permissions });
const plain = (value) => JSON.parse(JSON.stringify(value));

test("list searches match regex syntax literally and preserve Arabic and numeric search", () => {
  for (const search of ["[", ".*", "(a+)+$", "\\", "?", "^x$", "العميل", "12.25"]) {
    const query = data.parseCrmListQuery(new URLSearchParams({ search }));
    assert.equal(query.error, null);
    const regex = new RegExp(query.data.pattern, "i");
    assert.equal(regex.test(search), true);
    if (search === ".*") assert.equal(regex.test("unrelated"), false);
    assert.equal(query.data.search, search);
  }
});

test("list input bounds reject oversized searches and unsafe pagination without silent broadening", () => {
  for (const params of [{ search: "x".repeat(201) }, { page: "-1" }, { page: "1.5" }, { limit: "0" }, { limit: "Infinity" }, { page: "9".repeat(50) }, { page: "1000000", limit: "50" }]) {
    assert.equal(data.parseCrmListQuery(new URLSearchParams(params)).data, null);
  }
  assert.equal(data.parseCrmListQuery(new URLSearchParams({ limit: "100" })).data.limit, 50);
});

for (const resource of ["clients", "deals", "projects", "revenue", "expenses"]) {
  test(`${resource}: actual list handler escapes every query branch and rejects oversized search`, async () => {
    const filters = [];
    function query(filter) {
      filters.push(filter);
      const chain = { populate() { return this; }, select() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; }, then(resolve, reject) { return Promise.resolve([]).then(resolve, reject); } };
      return chain;
    }
    const model = { find: query, countDocuments: async (filter) => { filters.push(filter); return 0; } };
    const deps = {
      "@/lib/crmData": data, "@/lib/permissions": permissions,
      "@/lib/authorization": { authorizeRequest: async () => ({ user: { role: "admin" } }) },
      "@/lib/mongodb": async () => {},
      "@/lib/apiResponse": { successResponse: (body) => ({ status: 200, body }), errorResponse: (message, status) => ({ status, message }) },
      "@/lib/demoMode": { blockIfDemoMode: () => null },
      mongoose: { Types: { ObjectId: { isValid: () => true } } },
    };
    const source = fs.readFileSync(path.join(root, `app/api/${resource}/route.ts`), "utf8");
    for (const match of source.matchAll(/(?:from|import) ["'](@\/[^"']+)["']/g)) {
      if (!(match[1] in deps)) deps[match[1]] = match[1].startsWith("@/models/") ? model : {};
    }
    const route = load(`app/api/${resource}/route.ts`, deps);
    for (const search of ["[", ".*", "(a+)+$", "العميل", "12.25"]) {
      filters.length = 0;
      const response = await route.GET({ url: `http://localhost/api/${resource}?search=${encodeURIComponent(search)}` });
      assert.equal(response.status, 200);
      const patterns = [];
      function walk(value) {
        if (!value || typeof value !== "object") return;
        for (const [key, item] of Object.entries(value)) {
          if (key === "$regex") patterns.push(item);
          else walk(item);
        }
      }
      filters.forEach(walk);
      assert.ok(patterns.length > 0);
      for (const pattern of patterns) assert.equal(pattern, data.parseCrmListQuery(new URLSearchParams({ search })).data.pattern);
    }
    filters.length = 0;
    assert.equal((await route.GET({ url: `http://localhost/api/${resource}?search=${"x".repeat(201)}` })).status, 400);
    assert.equal(filters.length, 0);
  });
}

test("expense nested client label never exposes contacts, even to an admin", () => {
  const expense = { projectId: { _id: "project", name: "Project", clientId: { _id: "client", companyName: "Company", email: "private@example.test", phone: "private", password: "secret" } } };
  for (const actor of [{ role: "admin" }, { role: "employee", allowedPermissions: ["expenses.read"] }]) {
    const dto = plain(data.expenseDTO(expense, actor));
    assert.deepEqual(dto.projectId.clientId, { _id: "client", companyName: "Company" });
  }
  assert.equal(data.expenseDTO({ projectId: null }, { role: "admin" }).projectId, null);
});

const jsx = (type, props) => ({ type, props });
const uiDeps = { "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" }, "@mui/material": { Box: "Box", Button: "Button", Typography: "Typography", keyframes: () => "animation" } };
function nodes(node) {
  if (!node || typeof node !== "object") return [];
  return [node, ...(Array.isArray(node.props?.children) ? node.props.children : [node.props?.children]).flatMap(nodes)];
}

test("500 reuses the error design with explicit retry and safe fixed copy", () => {
  let retries = 0;
  const screen = load("components/access/AccessErrorScreen.tsx", uiDeps);
  const tree = screen.default({ status: 500, onRetry: () => { retries++; } });
  const controls = nodes(tree).filter((n) => n.type === "Button");
  assert.equal(controls[0].props.children, "Try again");
  assert.equal(controls[0].props.href, undefined);
  controls[0].props.onClick();
  assert.equal(retries, 1);
  assert.equal(controls[1].props.href, "/");
  assert.ok(JSON.stringify(tree).includes("Something went wrong."));
  assert.ok(JSON.stringify(tree).includes("500"));
});

test("root and global boundaries never pass internal errors into visible UI", () => {
  const Screen = () => null;
  for (const file of ["app/error.tsx", "app/global-error.tsx"]) {
    const boundary = load(file, { "react/jsx-runtime": uiDeps["react/jsx-runtime"], "@/components/access/ServerErrorScreen": Screen });
    const tree = boundary.default({ error: new Error("database-secret-host"), retry() {} });
    assert.equal(JSON.stringify(tree).includes("database-secret-host"), false);
    if (file.includes("global")) {
      assert.equal(tree.type, "html");
      assert.equal(tree.props.children.type, "body");
    }
  }
});
