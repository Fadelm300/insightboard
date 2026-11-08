import { AsyncLocalStorage } from "node:async_hooks";
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(file, deps) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, Date, Object, URL, require(name) {
    if (!(name in deps)) throw Error(`Unexpected dependency: ${name}`);
    return deps[name];
  } });
  return exports;
}
const plain = (value) => JSON.parse(JSON.stringify(value));

function fixture({ initializationFailure = false, missingLock = false } = {}) {
  const calls = { initialized: 0, transactions: 0, acquired: 0, operations: 0 };
  const session = { marker: "test session" };
  const mongoose = {
    set(key, value) { assert.equal(key, "transactionAsyncLocalStorage"); assert.equal(value, true); },
    Types: { ObjectId: class {} },
    connection: { async transaction(callback, options) {
      calls.transactions++;
      assert.deepEqual(plain(options), { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" }, readPreference: "primary" });
      return callback(session);
    } },
  };
  const lock = {
    updateOne(filter, update, options) {
      assert.deepEqual(plain(filter), { _id: "single-company-crm" });
      if (options.upsert) {
        calls.initialized++;
        if (initializationFailure && calls.initialized === 1) return Promise.reject(Error("initialization unavailable"));
        return Promise.resolve({ matchedCount: 1 });
      }
      assert.equal(options.session, session);
      assert.ok(update.$set.token);
      calls.acquired++;
      return Promise.resolve({ matchedCount: missingLock ? 0 : 1, modifiedCount: missingLock ? 0 : 1 });
    },
  };
  const helper = load("lib/crmWriteTransaction.ts", { mongoose, "node:async_hooks": { AsyncLocalStorage }, "@/models/CrmWriteLock": lock });
  return { helper, calls, session };
}

test("business writes acquire the shared database record before executing relationship logic", async () => {
  const f = fixture();
  const result = await f.helper.withCrmWriteTransaction(async (session) => {
    assert.equal(session, f.session);
    assert.equal(f.calls.acquired, 1);
    return "saved";
  });
  assert.equal(result, "saved");
  await f.helper.withCrmWriteTransaction(async () => "another save");
  assert.equal(f.calls.initialized, 1);
  assert.equal(f.calls.acquired, 2);
});

test("nested business services reuse the caller transaction instead of committing independently", async () => {
  const f = fixture();
  await f.helper.withCrmWriteTransaction(async (outer) => {
    await f.helper.withCrmWriteTransaction(async (inner) => assert.equal(inner, outer));
  });
  assert.equal(f.calls.transactions, 1);
  assert.equal(f.calls.acquired, 1);
});

test("coordination initialization retries after failure and a missing lock fails closed", async () => {
  const f = fixture({ initializationFailure: true });
  let executed = 0;
  await assert.rejects(f.helper.withCrmWriteTransaction(async () => executed++));
  assert.equal(executed, 0);
  await f.helper.withCrmWriteTransaction(async () => executed++);
  assert.equal(executed, 1);
  assert.equal(f.calls.initialized, 2);
  const missing = fixture({ missingLock: true });
  await assert.rejects(missing.helper.withCrmWriteTransaction(async () => executed++));
  assert.equal(executed, 1);
});

test("business operation errors propagate to the transaction boundary", async () => {
  const f = fixture();
  await assert.rejects(f.helper.withCrmWriteTransaction(async () => { throw Error("rollback required"); }), /rollback required/);
});

test("all CRM relationship mutation handlers route database reads and writes through shared coordination", () => {
  for (const [file, method] of [
    ["app/api/clients/route.ts", "POST"], ["app/api/clients/[id]/route.ts", "PUT"],
    ["app/api/deals/route.ts", "POST"], ["app/api/deals/[id]/route.ts", "PUT"],
    ["app/api/projects/route.ts", "POST"], ["app/api/projects/[id]/route.ts", "PUT"],
    ["app/api/revenue/route.ts", "POST"], ["app/api/revenue/[id]/route.ts", "PUT"],
    ["app/api/expenses/route.ts", "POST"], ["app/api/expenses/[id]/route.ts", "PUT"],
    ["app/api/deals/[id]/convert-to-project/route.ts", "POST"],
  ]) {
    const source = ts.createSourceFile(file, fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
    const handler = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === method);
    const calls = [];
    function visit(node, coordinated = false) {
      if (ts.isCallExpression(node) && node.expression.getText(source) === "withCrmWriteTransaction") coordinated = true;
      if (ts.isCallExpression(node) && /^(Client|Deal|Project|Revenue|Expense)\./.test(node.expression.getText(source))) calls.push({ coordinated, expression: node.expression.getText(source) });
      if (coordinated && ts.isCallExpression(node) && node.expression.getText(source) === "req.json") assert.fail(`${file} consumes the request inside a retryable callback`);
      ts.forEachChild(node, (child) => visit(child, coordinated));
    }
    visit(handler);
    assert.ok(calls.length > 0, file);
    assert.ok(calls.every((call) => call.coordinated), `${file}: ${JSON.stringify(calls)}`);
  }
});
