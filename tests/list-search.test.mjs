import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('..', import.meta.url));
const compile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
vm.runInNewContext(compile(fs.readFileSync(path.join(root, 'lib/listSearch.ts'), 'utf8')), { exports, AbortController });

for (const resource of ['clients', 'deals', 'projects', 'revenue', 'expenses']) {
  function harness() {
    const source = fs.readFileSync(path.join(root, `app/dashboard/${resource}/${resource}.client.tsx`), 'utf8');
    const begin = source.indexOf('const listRequests =');
    const end = source.indexOf('function handleCreateOpen', begin);
    assert.ok(begin > 0 && end > begin);
    const code = source.slice(begin, end);
    const requests = [];
    const updates = [];
    const timers = new Map();
    let effect;
    const effects = [];
    let time = 0;
    let nextId = 0;
    const context = {
      ...exports, URLSearchParams, AbortController,
      useRef: (value) => ({ current: value }), useCallback: (fn) => fn,
      useEffect: (fn) => { effect = fn; effects.push(fn); }, page: 1, searchQuery: '',
      window: {
        setTimeout(fn, delay) { const id = ++nextId; timers.set(id, { fn, at: time + delay }); return id; },
        clearTimeout(id) { timers.delete(id); },
      },
      apiFetch(url, options) {
        return new Promise((resolve, reject) => requests.push({ url, options, resolve, reject }));
      },
    };
    for (const match of code.matchAll(/\b(set\w+)\(/g)) {
      context[match[1]] = (value) => updates.push([match[1], value]);
    }
    for (const match of code.matchAll(/\b(get\w+)\(/g)) {
      context[match[1]] = match[1].includes('Pagination')
        ? () => ({ total: 1, totalPages: 1 }) : (value) => value;
    }
    for (const match of code.matchAll(/String\((\w+_PER_PAGE)\)/g)) context[match[1]] = 7;
    vm.createContext(context);
    const fetchName = resource === 'clients' ? 'fetchClients' : 'fetchData';
    vm.runInContext(compile(code + `\nglobalThis.fetchList = ${fetchName};`), context);
    return {
      requests, updates, fetch: context.fetchList,
      mountOptions: () => effects[0](),
      render(search, page = 1) {
        context.page = page;
        context.searchQuery = search;
        return effect();
      },
      advance(ms) {
        time += ms;
        for (const [id, timer] of timers) {
          if (timer.at <= time) { timers.delete(id); timer.fn(); }
        }
      },
    };
  }

  if (resource !== 'clients') {
    test(`${resource}: list results do not wait for form options or refetch them during search`, async () => {
      const h = harness();
      const cleanupOptions = h.mountOptions();
      const options = [...h.requests];
      assert.ok(options.length > 0);
      assert.ok(options.every((request) => request.url.startsWith('/api/lookups/')));
      const pending = h.fetch(1, 'world');
      const list = h.requests.at(-1);
      assert.match(list.url, new RegExp(`/api/${resource}\\?`));
      list.resolve('ready');
      await pending;
      assert.ok(h.updates.some(([key, value]) => key === 'setLoading' && value === false));
      const second = h.fetch(2, 'world');
      h.requests.at(-1).resolve('next');
      await second;
      assert.equal(h.requests.filter((request) => request.url.startsWith('/api/lookups/')).length, options.length);
      cleanupOptions();
      options.forEach((request) => request.resolve('stale-options'));
      await Promise.resolve();
      await Promise.resolve();
      assert.ok(options.every((request) => request.options.signal.aborted));
      assert.equal(h.updates.some(([key]) => ['setClients', 'setDeals', 'setProjects'].includes(key) && key !== `set${resource[0].toUpperCase()}${resource.slice(1)}`), false);
    });
  }

  test(`${resource}: initial loads, pagination and clearing do not wait for the search delay`, () => {
    const h = harness();
    let cleanup = h.render("");
    h.advance(0);
    assert.equal(h.requests.filter((r) => r.url.startsWith(`/api/${resource}?`)).length, 1);
    cleanup();
    cleanup = h.render("", 2);
    h.advance(0);
    assert.equal(h.requests.filter((r) => r.url.startsWith(`/api/${resource}?`)).length, 2);
    cleanup();
    cleanup = h.render("world");
    h.advance(799);
    assert.equal(h.requests.filter((r) => r.url.startsWith(`/api/${resource}?`)).length, 2);
    h.advance(1);
    assert.equal(h.requests.filter((r) => r.url.startsWith(`/api/${resource}?`)).length, 3);
    cleanup();
    cleanup = h.render("world", 2);
    h.advance(0);
    assert.equal(h.requests.filter((r) => r.url.startsWith(`/api/${resource}?`)).length, 4);
    cleanup();
    cleanup = h.render("");
    h.advance(0);
    assert.equal(h.requests.filter((r) => r.url.startsWith(`/api/${resource}?`)).length, 5);
    cleanup();
  });

  test(`${resource}: fast typing waits 800ms after the final letter and cancels on leave`, () => {
    const h = harness();
    let cleanup;
    for (const search of ['w', 'wo', 'wor', 'worl', 'world']) {
      cleanup?.();
      cleanup = h.render(search);
      h.advance(100);
      assert.equal(h.requests.length, 0);
    }
    h.advance(699);
    assert.equal(h.requests.length, 0);
    h.advance(1);
    assert.equal(h.requests.filter((r) => r.url.startsWith(`/api/${resource}?`)).length, 1);
    assert.match(h.requests[0].url, /search=world/);
    cleanup();
    assert.ok(h.requests.every((r) => r.options.signal.aborted));
  });

  test(`${resource}: superseded responses and errors cannot replace newer results or loading state`, async () => {
    const h = harness();
    const old = h.fetch(1, 'old');
    const oldRequests = [...h.requests];
    const current = h.fetch(1, 'new');
    const newRequests = h.requests.slice(oldRequests.length);
    assert.ok(oldRequests.every((r) => r.options.signal.aborted));
    newRequests.forEach((r) => r.resolve('new-result'));
    await current;
    const afterNew = [...h.updates];
    oldRequests.forEach((r) => r.resolve('old-result'));
    await old;
    assert.deepEqual(h.updates, afterNew);
    const failed = h.fetch(1, 'stale-failure');
    const failedRequests = h.requests.slice(-newRequests.length);
    const latest = h.fetch(1, 'latest');
    const beforeFailure = [...h.updates];
    failedRequests.forEach((r) => r.reject(new Error('stale error')));
    await failed;
    assert.deepEqual(h.updates, beforeFailure);
    h.requests.slice(-newRequests.length).forEach((r) => r.resolve('latest-result'));
    await latest;
  });
}
