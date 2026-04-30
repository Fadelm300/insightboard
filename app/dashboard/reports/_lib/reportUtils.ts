import type { WorkSheet } from "xlsx";

import type { FinanceSummary } from "./reportTypes";

export const emptySummary: FinanceSummary = {
  totalRevenue: 0,
  totalExpenses: 0,
  netProfit: 0,
  revenueCount: 0,
  expenseCount: 0,
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function extractList<T>(
  response: Record<string, unknown>,
  keys: string[]
): T[] {
  if (Array.isArray(response.data)) return response.data as T[];

  if (isRecord(response.data)) {
    for (const key of keys) {
      const value = response.data[key];
      if (Array.isArray(value)) return value as T[];
    }
  }

  for (const key of keys) {
    const value = response[key];
    if (Array.isArray(value)) return value as T[];
  }

  return [];
}

export function extractObject<T>(
  response: Record<string, unknown>,
  keys: string[],
  fallback: T
): T {
  if (isRecord(response.data)) {
    for (const key of keys) {
      const value = response.data[key];

      if (isRecord(value)) {
        return value as T;
      }
    }

    return response.data as T;
  }

  for (const key of keys) {
    const value = response[key];

    if (isRecord(value)) {
      return value as T;
    }
  }

  return fallback;
}

export function formatMoney(value?: number) {
  return `${Number(value || 0).toFixed(2)} BHD`;
}

export function formatNumber(value?: number) {
  return Number(value || 0).toFixed(2);
}

export function formatPercent(value?: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export function getTodayFileDate() {
  return new Date().toISOString().slice(0, 10);
}

export function escapeHtml(value: string | number) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildHtmlTable(
  title: string,
  headers: string[],
  rows: Array<Array<string | number>>
) {
  return `
    <section>
      <h2>${escapeHtml(title)}</h2>
      <table>
        <thead>
          <tr>
            ${headers
              .map((header) => `<th>${escapeHtml(header)}</th>`)
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${
            rows.length > 0
              ? rows
                  .map(
                    (row) => `
                      <tr>
                        ${row
                          .map((cell) => `<td>${escapeHtml(cell)}</td>`)
                          .join("")}
                      </tr>
                    `
                  )
                  .join("")
              : `<tr><td colspan="${headers.length}">No data available</td></tr>`
          }
        </tbody>
      </table>
    </section>
  `;
}

export function setSheetColumnWidths(sheet: WorkSheet, widths: number[]) {
  sheet["!cols"] = widths.map((width) => ({ wch: width }));
}

export function getEntityId(value?: { _id: string } | string | null) {
  if (!value) return "";
  return typeof value === "object" ? value._id : value;
}

export function formatDateToInputValue(date?: string) {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getMonthKey(date?: string) {
  const inputDate = formatDateToInputValue(date);
  return inputDate ? inputDate.slice(0, 7) : "";
}