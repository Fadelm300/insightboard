import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as XLSX from 'xlsx';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
function execute(source, context = {}) {
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, ...context });
  return exports;
}
const progress = execute(read('lib/paymentProgress.ts'));
const utils = execute(read('app/dashboard/reports/_lib/reportUtils.ts'));

test('payment progress uses the same decimal rule and preserves pending pricing', () => {
  assert.equal(progress.paymentProgressPercent(80.25, 200), 40.1);
  assert.equal(utils.formatPercent(progress.paymentProgressPercent(80.25, 200)), '40.1%');
  assert.equal(progress.paymentProgressPercent(80.25, null), null);
  assert.equal(progress.paymentProgressPercent(10, 0), 0);
  assert.equal(progress.paymentProgressPercent(-1, 200), 0);
  assert.equal(progress.paymentProgressPercent(300, 200), 100);
});

test('actual Excel row builders round-trip monetary cells as numbers and pending as text', () => {
  const source = read('app/dashboard/reports/reports.client.tsx');
  const begin = source.indexOf('  function getSummaryRows()');
  const end = source.indexOf('  async function authorizeReportAction', begin);
  assert.ok(begin > 0 && end > begin);
  const context = {
    ...utils,
    summary: { totalRevenue: 220, totalExpenses: 1267, netProfit: -1047 },
    profitMargin: -475.9, salesStats: { totalDeals: 1, closedWon: 1, closedLost: 0, conversionRate: 100 },
    averageProjectValue: 200, bestClient: null, bestProjectType: null,
    monthly: [{ month: '2026-11', revenue: 80.25, expenses: 20.25, profit: 60 }],
    projectsFinance: [
      { project: { name: 'Paid', type: 'Website', price: 200 }, totalRevenue: 80.25, totalExpenses: 20.25, netProfit: 60, remainingBalance: 119.75, paymentProgress: 40.1 },
      { project: { name: 'Pending', price: null }, totalRevenue: 0, totalExpenses: 0, netProfit: 0, remainingBalance: null, paymentProgress: null },
    ],
    clientsFinance: [], projectTypesFinance: [],
  };
  const builders = execute(source.slice(begin, end) + '\nexport { getSummaryRows, getProjectRows, getMonthlyRows };', context);
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Project', 'Type', 'Price BHD', 'Revenue BHD', 'Expenses BHD', 'Net Profit BHD', 'Remaining BHD', 'Payment'],
    ...builders.getProjectRows(),
  ]);
  utils.formatSheetNumbers(sheet);
  XLSX.utils.book_append_sheet(book, sheet, 'Projects');
  const summarySheet = XLSX.utils.aoa_to_sheet(builders.getSummaryRows());
  utils.formatSheetNumbers(summarySheet);
  XLSX.utils.book_append_sheet(book, summarySheet, 'Summary');
  const reopened = XLSX.read(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer', cellNF: true });
  for (const [address, expected] of Object.entries({ C2: 200, D2: 80.25, E2: 20.25, F2: 60, G2: 119.75 })) {
    assert.equal(reopened.Sheets.Projects[address].t, 'n');
    assert.equal(reopened.Sheets.Projects[address].v, expected);
    assert.equal(reopened.Sheets.Projects[address].z, '#,##0.00');
  }
  assert.equal(reopened.Sheets.Projects.C3.t, 's');
  assert.equal(reopened.Sheets.Projects.C3.v, 'Pending pricing');
  assert.equal(reopened.Sheets.Projects.H2.v, '40.1%');
  assert.equal(reopened.Sheets.Summary.B2.t, 'n');
  assert.equal(reopened.Sheets.Summary.B2.v, 220);
  assert.equal(reopened.Sheets.Summary.B6.t, 'n');
  assert.notEqual(reopened.Sheets.Summary.B6.z, '#,##0.00');
});

for (const [resource, entity] of Object.entries({ clients: 'Client', deals: 'Deal', projects: 'Project', revenue: 'Revenue', expenses: 'Expense' })) {
  test(`${resource}: edit/archive opens only after its action menu has exited`, () => {
    const source = read(`app/dashboard/${resource}/${resource}.client.tsx`);
    const begin = source.indexOf('  function handleActionMenuClose()');
    const end = source.indexOf('  async function handleSubmit', begin);
    assert.ok(begin > 0 && end > begin);
    const calls = [];
    const record = { _id: 'synthetic' };
    const pendingMenuAction = { current: null };
    const handlers = execute(source.slice(begin, end) + '\nexport { handleMenuEdit, handleMenuDelete, handleActionMenuExited };', {
      pendingMenuAction, [`action${entity}`]: record,
      setActionAnchorEl: () => calls.push('close'), [`setAction${entity}`]: () => {},
      handleEditOpen: (value) => calls.push(['edit', value]), [`setDelete${entity}`]: (value) => calls.push(['archive', value]),
    });
    handlers.handleMenuEdit();
    assert.deepEqual(calls, ['close']);
    handlers.handleActionMenuExited();
    assert.deepEqual(calls.at(-1), ['edit', record]);
    handlers.handleActionMenuExited();
    assert.equal(calls.length, 2);
    handlers.handleMenuDelete();
    assert.equal(calls.at(-1), 'close');
    handlers.handleActionMenuExited();
    assert.deepEqual(calls.at(-1), ['archive', record]);
  });
}

test('denied page fallback navigates to a fixed standalone page without rendering protected data', () => {
  let effect;
  const calls = [];
  const component = execute(read('components/access/PermissionDenied.tsx'), {
    window: { location: { replace: (url) => calls.push(url) } },
    require(name) {
      if (name === 'react') return { useEffect: (fn) => { effect = fn; } };
      if (name === 'react/jsx-runtime') return { jsx: (tag, props) => ({ tag, props }), jsxs: (tag, props) => ({ tag, props }) };
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  const view = component.default({ home: '/dashboard/projects' });
  assert.equal(view.tag, 'p');
  assert.equal(view.props.role, 'status');
  assert.equal(calls.length, 0);
  effect();
  assert.deepEqual(calls, ['/access-denied']);
});

test('a confirmed conversion updates the local project link without reloading form options', async () => {
  const source = read('app/dashboard/deals/deals.client.tsx');
  const begin = source.indexOf('  async function handleConvertToProject');
  const end = source.indexOf('\n  return (', begin);
  assert.ok(begin > 0 && end > begin);
  let projects = [];
  const calls = [];
  const handler = execute(source.slice(begin, end) + '\nexport { handleConvertToProject };', {
    apiFetch: async (url) => { calls.push(url); return { data: { project: { _id: 'new-project', dealId: 'won-deal' } } }; },
    setProjects: (update) => { projects = update(projects); },
    setSaving: () => {}, setError: () => {}, setSuccess: () => {},
    fetchData: async () => calls.push('refresh-list'), page: 1, searchQuery: '',
  });
  await handler.handleConvertToProject({ _id: 'won-deal' });
  assert.equal(projects[0].dealId, 'won-deal');
  assert.deepEqual(calls, ['/api/deals/won-deal/convert-to-project', 'refresh-list']);
  assert.match(source, /disabled=\{saving \|\| !canConvert \|\| !projectLinksReady\}/);
});

test('standalone access destination renders the restricted design without redirecting to itself', async () => {
  const calls = [];
  const destination = execute(read('app/access-denied/page.tsx'), {
    require(name) {
      if (name === 'next/navigation') return { redirect: (url) => { throw new Error(url); } };
      if (name === '@/components/access/AccessErrorScreen') return { default: 'AccessErrorScreen' };
      if (name === '@/lib/auth') return { getCurrentUser: async () => ({ role: 'employee' }) };
      if (name === '@/lib/permissions') return { firstAllowedPage: () => '/dashboard/projects' };
      if (name === 'react/jsx-runtime') return { jsx: (tag, props) => { calls.push(tag); return { tag, props }; } };
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  const view = await destination.default();
  assert.equal(view.tag, 'AccessErrorScreen');
  assert.equal(view.props.restricted, true);
  assert.equal(view.props.home, '/dashboard/projects');
  assert.deepEqual(calls, ['AccessErrorScreen']);
});
