import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as XLSX from "xlsx";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

function execute(source, context = {}) {
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};

  vm.runInNewContext(code, { exports, ...context });

  return exports;
}

const utils = execute(read("app/dashboard/reports/_lib/reportUtils.ts"));
const page = read("app/dashboard/reports/reports.client.tsx");
const parsed = ts.createSourceFile("reports.tsx", page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function actualAverage(name, rows) {
  let callback;

  function find(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(parsed) === name) {
      assert.ok(ts.isCallExpression(node.initializer));
      callback = node.initializer.arguments[0].getText(parsed);
    }

    ts.forEachChild(node, find);
  }

  find(parsed);
  assert.ok(callback, `${name} callback exists`);

  const { calculate } = execute(`export const calculate = ${callback};`, {
    ...utils,
    projectsFinance: rows,
    filteredProjectsFinance: rows,
  });

  return calculate();
}

test("project average excludes pending pricing instead of dividing 800 by four", () => {
  const rows = [200, null, 500, 100].map((price) => ({ project: { price } }));

  assert.equal(utils.averagePricedProjectValue(rows), 800 / 3);
  assert.equal(utils.formatAverageProjectValue(utils.averagePricedProjectValue(rows)), "266.67 BHD");
});

test("general and filtered reports calculate the actual priced-only callbacks", () => {
  const all = [200, null, 500, 100].map((price) => ({ project: { price } }));
  const filtered = [200, null].map((price) => ({ project: { price } }));

  assert.equal(actualAverage("averageProjectValue", all), 800 / 3);
  assert.equal(actualAverage("filteredAverageProjectValue", filtered), 200);
});

test("empty and entirely unpriced averages remain absent with explicit display text", () => {
  for (const rows of [[], [{ project: { price: null } }], [{}, { project: null }]]) {
    assert.equal(utils.averagePricedProjectValue(rows), null);
    assert.equal(actualAverage("averageProjectValue", rows), null);
    assert.equal(actualAverage("filteredAverageProjectValue", rows), null);
    assert.equal(utils.formatAverageProjectValue(null), "No priced projects");
  }

  assert.equal(utils.formatMoney(null), "Pending pricing");
});

test("real zero prices are included while malformed and non-finite prices are excluded", () => {
  const rows = [0, 200, null, undefined, -1, NaN, Infinity, "500"].map((price) => ({ project: { price } }));

  assert.equal(utils.averagePricedProjectValue(rows), 100);
  assert.equal(utils.averagePricedProjectValue([{ project: { price: 0 } }]), 0);
  assert.equal(utils.formatAverageProjectValue(0), "0.00 BHD");
});

test("average calculation does not round individual prices or mutate input records", () => {
  const rows = Object.freeze([
    Object.freeze({ project: Object.freeze({ price: 10.01 }) }),
    Object.freeze({ project: Object.freeze({ price: 10.02 }) }),
    Object.freeze({ project: Object.freeze({ price: null }) }),
  ]);

  assert.ok(Math.abs(utils.averagePricedProjectValue(rows) - 10.015) < 1e-12);
  assert.equal(rows[2].project.price, null);
});

function summaryRows(averageProjectValue) {
  const begin = page.indexOf("  function getSummaryRows()");
  const end = page.indexOf("  async function authorizeReportAction", begin);

  assert.ok(begin > 0 && end > begin);

  const builders = execute(page.slice(begin, end) + "\nexport { getSummaryRows };", {
    ...utils,
    summary: { totalRevenue: 80.25, totalExpenses: 20.25, netProfit: 60 },
    profitMargin: 74.8,
    salesStats: { totalDeals: 1, closedWon: 1, closedLost: 0, conversionRate: 100 },
    averageProjectValue,
    bestClient: null,
    bestProjectType: null,
  });

  return builders.getSummaryRows();
}

test("actual Excel summary retains a numeric average and explicit text when no price exists", () => {
  for (const average of [800 / 3, null, 0]) {
    const rows = summaryRows(average);
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const index = rows.findIndex(([label]) => label === "Average Project Value");

    utils.formatSheetNumbers(sheet);

    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Summary");
    const bytes = XLSX.write(book, { type: "buffer", bookType: "xlsx" });
    const reopened = XLSX.read(bytes, { type: "buffer", cellNF: true });
    const cell = reopened.Sheets.Summary[`B${index + 1}`];

    assert.equal(cell.t, average === null ? "s" : "n");
    assert.equal(cell.v, average === null ? "No priced projects" : Number(average.toFixed(2)));
  }
});

test("printed report timestamps use explicit Latin digits and a Gregorian English date", () => {
  const value = utils.formatReportGeneratedAt(new Date(2026, 10, 9, 17, 42, 55));

  assert.match(value, /9 Nov 2026/);
  assert.match(value, /17:42:55/);
  assert.doesNotMatch(value, /[\u0600-\u06ff]/);
  assert.equal((page.match(/Generated at \$\{escapeHtml\(formatReportGeneratedAt\(\)\)\}/g) || []).length, 2);
});
