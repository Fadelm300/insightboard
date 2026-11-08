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
    let time = 0;
    let nextId = 0;
    const context = {
      ...exports, URLSearchParams,
      useRef: (value) => ({ current: value }), useCallback: (fn) => fn,
      useEffect: (fn) => { effect = fn; }, page: 1, searchQuery: '',
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
      render(search) {
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
