import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));

function harness(initialUnauthorized = false) {
  const effects = [];
  const events = new Map();
  const navigations = [];
  const broadcasts = [];
  const fetches = [];
  const pending = [];
  let refreshes = 0;
  const channels = [];
  const router = { replace: (url) => navigations.push(url), refresh: () => { refreshes += 1; } };
  const add = (name, callback) => events.set(name, callback);
  const fakeWindow = {
    addEventListener: add,
    removeEventListener: (name) => events.delete(name),
    setInterval: () => 1,
    clearInterval: () => {},
    dispatchEvent: (event) => events.get(event.type)?.(event),
  };
  class FakeChannel {
    constructor() { channels.push(this); }
    postMessage(type) { broadcasts.push(type); }
    close() {}
  }
  const api = {
    AUTH_CHANGED_EVENT: "insightboard-auth-changed",
    logout: async () => {},
    notifyAuthChanged: (type) => {
      fakeWindow.dispatchEvent({ type: "insightboard-auth-changed", detail: type });
      broadcasts.push(type);
    },
  };
  const react = {
    Fragment: "Fragment",
    useState: (initial) => [initial, () => {}],
    useRef: (initial) => ({ current: initial }),
    useEffect: (callback) => effects.push(callback),
  };
  const dependencies = {
    react,
    "react/jsx-runtime": { jsx: () => ({}), jsxs: () => ({}), Fragment: "Fragment" },
    "next/navigation": { useRouter: () => router },
    "@mui/material": new Proxy({}, { get: () => "component" }),
    "@/lib/apiClient": api,
  };
  const source = fs.readFileSync(path.join(root, "components/auth/AuthGuard.tsx"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, console, Date, Number, Math, JSON,
    window: fakeWindow,
    document: { visibilityState: "visible", addEventListener: add, removeEventListener: (name) => events.delete(name) },
    BroadcastChannel: FakeChannel,
    fetch: (url, options) => {
      fetches.push({ url, options });
      return new Promise((resolve) => pending.push(resolve));
    },
    require: (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  exports.default({ children: null });
  const cleanup = effects[0]();
  const valid = () => ({ status: 200, ok: true, json: async () => ({ data: { user: { id: "test-user" }, session: { expiresAt: new Date(Date.now()+120_000).toISOString(), absoluteExpiresAt: new Date(Date.now()+28_800_000).toISOString(), serverNow: new Date().toISOString(), warningSeconds: 30 } } }) });
  return {
    navigations, broadcasts, fetches, pending, cleanup,
    get refreshes() { return refreshes; },
    resolveInitial: () => pending.shift()(initialUnauthorized ? {status:401,ok:false} : valid()),
    resolveNext: () => pending.shift()(valid()),
    auth: (type) => events.get("insightboard-auth-changed")?.({detail:type}),
    broadcast: (type) => channels[0].onmessage?.({data:type}),
    continue: () => events.get("insightboard-session-continue")?.(),
    visible: () => events.get("visibilitychange")?.(),
  };
}

const settle = async () => { for (let i=0;i<6;i++) await Promise.resolve(); };

test("repeated logout and cross-tab events navigate once without refreshing", async () => {
  const h = harness();
  h.resolveInitial(); await settle();
  for (let i=0;i<20;i++) { h.auth("logout"); h.broadcast("logout"); }
  assert.equal(h.navigations.length, 1);
  assert.equal(h.navigations[0], "/login");
  assert.equal(h.refreshes, 0);
  h.cleanup();
});

test("401 plus duplicate expired notifications terminate once and stop further requests", async () => {
  const h = harness(true);
  h.resolveInitial(); await settle();
  for (let i=0;i<20;i++) { h.auth("expired"); h.broadcast("expired"); h.visible(); }
  assert.equal(h.navigations.length, 1);
  assert.equal(h.navigations[0], "/login?reason=session-expired");
  assert.equal(h.refreshes, 0);
  assert.equal(h.fetches.length, 1);
  assert.equal(h.broadcasts.length, 1);
  h.cleanup();
});

test("explicit continuation is queued behind an in-flight status request", async () => {
  const h = harness();
  h.continue();
  h.resolveInitial(); await settle();
  assert.equal(h.fetches.length, 2);
  assert.equal(h.fetches[1].url, "/api/auth/renew");
  assert.equal(JSON.parse(h.fetches[1].options.body).mode, "continue");
  h.resolveNext(); await settle();
  h.cleanup();
});
