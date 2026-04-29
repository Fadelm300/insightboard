"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import * as XLSX from "xlsx";

import { apiFetch } from "@/lib/apiClient";

type ApiResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
  [key: string]: unknown;
};

type FinanceSummary = {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueCount: number;
  expenseCount: number;
};

type MonthlyFinance = {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  revenueCount?: number;
  expenseCount?: number;
};

type ProjectFinance = {
  project?: {
    _id: string;
    name: string;
    type?: string;
    price?: number;
    status?: string;
    paymentStatus?: string;
  };
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  remainingBalance: number;
  paymentProgress: number;
  revenueCount?: number;
  expenseCount?: number;
};

type ClientFinance = {
  client?: {
    _id: string;
    companyName: string;
    contactPerson?: string;
    email?: string;
  };
  totalProjects: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueCount?: number;
  expenseCount?: number;
};

type ProjectTypeFinance = {
  type: string;
  projectCount: number;
  totalProjectValue: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueCount?: number;
  expenseCount?: number;
};

type Deal = {
  _id: string;
  title: string;
  status: string;
  finalPrice?: number;
  estimatedBudget?: number;
};

const emptySummary: FinanceSummary = {
  totalRevenue: 0,
  totalExpenses: 0,
  netProfit: 0,
  revenueCount: 0,
  expenseCount: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractList<T>(response: ApiResponse, keys: string[]): T[] {
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

function extractObject<T>(
  response: ApiResponse,
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

function formatMoney(value?: number) {
  return `${Number(value || 0).toFixed(2)} BHD`;
}

function formatNumber(value?: number) {
  return Number(value || 0).toFixed(2);
}

function formatPercent(value?: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function getTodayFileDate() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value: string | number) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildHtmlTable(
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
            ${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}
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

function setSheetColumnWidths(
  sheet: XLSX.WorkSheet,
  widths: number[]
) {
  sheet["!cols"] = widths.map((width) => ({ wch: width }));
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<FinanceSummary>(emptySummary);
  const [monthly, setMonthly] = useState<MonthlyFinance[]>([]);
  const [projectsFinance, setProjectsFinance] = useState<ProjectFinance[]>([]);
  const [clientsFinance, setClientsFinance] = useState<ClientFinance[]>([]);
  const [projectTypesFinance, setProjectTypesFinance] = useState<
    ProjectTypeFinance[]
  >([]);
  const [deals, setDeals] = useState<Deal[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchReportsData() {
    setLoading(true);
    setError("");

    try {
      const [
        summaryResponse,
        monthlyResponse,
        projectsFinanceResponse,
        clientsFinanceResponse,
        projectTypesResponse,
        dealsResponse,
      ] = await Promise.all([
        apiFetch<ApiResponse>("/api/finance/summary"),
        apiFetch<ApiResponse>("/api/finance/monthly"),
        apiFetch<ApiResponse>("/api/finance/projects"),
        apiFetch<ApiResponse>("/api/finance/clients"),
        apiFetch<ApiResponse>("/api/finance/project-types"),
        apiFetch<ApiResponse>("/api/deals"),
      ]);

      setSummary(
        extractObject<FinanceSummary>(
          summaryResponse,
          ["summary", "financeSummary"],
          emptySummary
        )
      );

      setMonthly(
        extractList<MonthlyFinance>(monthlyResponse, [
          "monthly",
          "monthlyData",
          "months",
          "items",
          "records",
        ])
      );

      setProjectsFinance(
        extractList<ProjectFinance>(projectsFinanceResponse, [
          "projects",
          "projectsFinance",
          "projectFinance",
          "items",
          "records",
        ])
      );

      setClientsFinance(
        extractList<ClientFinance>(clientsFinanceResponse, [
          "clients",
          "clientsFinance",
          "clientFinance",
          "items",
          "records",
        ])
      );

      setProjectTypesFinance(
        extractList<ProjectTypeFinance>(projectTypesResponse, [
          "projectTypes",
          "projectTypesFinance",
          "types",
          "items",
          "records",
        ])
      );

      setDeals(extractList<Deal>(dealsResponse, ["deals", "items", "records"]));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load reports";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReportsData();
  }, []);

  const salesStats = useMemo(() => {
    const totalDeals = deals.length;
    const closedWon = deals.filter((deal) => deal.status === "Closed Won")
      .length;
    const closedLost = deals.filter((deal) => deal.status === "Closed Lost")
      .length;

    const conversionRate =
      totalDeals > 0 ? Number(((closedWon / totalDeals) * 100).toFixed(1)) : 0;

    return {
      totalDeals,
      closedWon,
      closedLost,
      conversionRate,
    };
  }, [deals]);

  const averageProjectValue = useMemo(() => {
    if (projectsFinance.length === 0) return 0;

    const totalValue = projectsFinance.reduce((sum, item) => {
      return sum + Number(item.project?.price || 0);
    }, 0);

    return totalValue / projectsFinance.length;
  }, [projectsFinance]);

  const profitMargin = useMemo(() => {
    if (!summary.totalRevenue) return 0;
    return (summary.netProfit / summary.totalRevenue) * 100;
  }, [summary]);

  const bestClient = useMemo(() => {
    return [...clientsFinance].sort(
      (a, b) => Number(b.totalRevenue || 0) - Number(a.totalRevenue || 0)
    )[0];
  }, [clientsFinance]);

  const bestProjectType = useMemo(() => {
    return [...projectTypesFinance].sort(
      (a, b) => Number(b.totalRevenue || 0) - Number(a.totalRevenue || 0)
    )[0];
  }, [projectTypesFinance]);

  function getSummaryRows() {
    return [
      ["Metric", "Value"],
      ["Total Revenue", formatNumber(summary.totalRevenue)],
      ["Total Expenses", formatNumber(summary.totalExpenses)],
      ["Net Profit", formatNumber(summary.netProfit)],
      ["Profit Margin", formatPercent(profitMargin)],
      ["Total Deals", salesStats.totalDeals],
      ["Closed Won", salesStats.closedWon],
      ["Closed Lost", salesStats.closedLost],
      ["Conversion Rate", formatPercent(salesStats.conversionRate)],
      ["Average Project Value", formatNumber(averageProjectValue)],
      ["Best Client", bestClient?.client?.companyName || "-"],
      ["Best Project Type", bestProjectType?.type || "-"],
    ];
  }

  function getMonthlyRows() {
    return monthly.map((item) => [
      item.month,
      formatNumber(item.revenue),
      formatNumber(item.expenses),
      formatNumber(item.profit),
    ]);
  }

  function getProjectRows() {
    return projectsFinance.map((item) => [
      item.project?.name || "-",
      item.project?.type || "-",
      formatNumber(item.project?.price),
      formatNumber(item.totalRevenue),
      formatNumber(item.totalExpenses),
      formatNumber(item.netProfit),
      formatNumber(item.remainingBalance),
      formatPercent(item.paymentProgress),
    ]);
  }

  function getClientRows() {
    return clientsFinance.map((item) => [
      item.client?.companyName || "-",
      item.totalProjects,
      formatNumber(item.totalRevenue),
      formatNumber(item.totalExpenses),
      formatNumber(item.netProfit),
    ]);
  }

  function getProjectTypeRows() {
    return projectTypesFinance.map((item) => [
      item.type,
      item.projectCount,
      formatNumber(item.totalProjectValue),
      formatNumber(item.totalRevenue),
      formatNumber(item.totalExpenses),
      formatNumber(item.netProfit),
    ]);
  }

  function handleExportExcel() {
    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.aoa_to_sheet(getSummaryRows());
    setSheetColumnWidths(summarySheet, [28, 24]);

    const monthlySheet = XLSX.utils.aoa_to_sheet([
      ["Month", "Revenue BHD", "Expenses BHD", "Profit BHD"],
      ...getMonthlyRows(),
    ]);
    setSheetColumnWidths(monthlySheet, [16, 18, 18, 18]);

    const projectsSheet = XLSX.utils.aoa_to_sheet([
      [
        "Project",
        "Type",
        "Price BHD",
        "Revenue BHD",
        "Expenses BHD",
        "Net Profit BHD",
        "Remaining BHD",
        "Payment",
      ],
      ...getProjectRows(),
    ]);
    setSheetColumnWidths(projectsSheet, [32, 22, 16, 16, 16, 18, 18, 14]);

    const clientsSheet = XLSX.utils.aoa_to_sheet([
      ["Client", "Projects", "Revenue BHD", "Expenses BHD", "Net Profit BHD"],
      ...getClientRows(),
    ]);
    setSheetColumnWidths(clientsSheet, [28, 14, 18, 18, 18]);

    const projectTypesSheet = XLSX.utils.aoa_to_sheet([
      [
        "Type",
        "Projects",
        "Total Value BHD",
        "Revenue BHD",
        "Expenses BHD",
        "Net Profit BHD",
      ],
      ...getProjectTypeRows(),
    ]);
    setSheetColumnWidths(projectTypesSheet, [24, 14, 20, 18, 18, 18]);

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    XLSX.utils.book_append_sheet(workbook, monthlySheet, "Monthly");
    XLSX.utils.book_append_sheet(workbook, projectsSheet, "Projects");
    XLSX.utils.book_append_sheet(workbook, clientsSheet, "Clients");
    XLSX.utils.book_append_sheet(workbook, projectTypesSheet, "Project Types");

    XLSX.writeFile(workbook, `insightboard-reports-${getTodayFileDate()}.xlsx`);
  }

  function handlePrintPdf() {
    const reportWindow = window.open("", "_blank", "width=1100,height=800");

    if (!reportWindow) {
      setError("Popup blocked. Allow popups to print or save PDF.");
      return;
    }

    const summaryRows = [
      ["Total Revenue", formatMoney(summary.totalRevenue)],
      ["Total Expenses", formatMoney(summary.totalExpenses)],
      ["Net Profit", formatMoney(summary.netProfit)],
      ["Profit Margin", formatPercent(profitMargin)],
      ["Total Deals", salesStats.totalDeals],
      ["Closed Won", salesStats.closedWon],
      ["Closed Lost", salesStats.closedLost],
      ["Conversion Rate", formatPercent(salesStats.conversionRate)],
      ["Average Project Value", formatMoney(averageProjectValue)],
      ["Best Client", bestClient?.client?.companyName || "-"],
      ["Best Project Type", bestProjectType?.type || "-"],
    ];

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>InsightBoard Reports</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #111827;
              padding: 24px;
            }

            h1 {
              margin-bottom: 4px;
            }

            .subtitle {
              color: #6b7280;
              margin-bottom: 24px;
            }

            section {
              margin-bottom: 28px;
              page-break-inside: avoid;
            }

            h2 {
              font-size: 18px;
              margin-bottom: 10px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }

            th,
            td {
              border: 1px solid #d1d5db;
              padding: 8px;
              text-align: left;
              vertical-align: top;
            }

            th {
              background: #f3f4f6;
              font-weight: 700;
            }

            @media print {
              button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <h1>InsightBoard Reports</h1>
          <div class="subtitle">
            Generated at ${escapeHtml(new Date().toLocaleString())}
          </div>

          ${buildHtmlTable("Summary", ["Metric", "Value"], summaryRows)}

          ${buildHtmlTable(
            "Monthly Finance",
            ["Month", "Revenue", "Expenses", "Profit"],
            monthly.map((item) => [
              item.month,
              formatMoney(item.revenue),
              formatMoney(item.expenses),
              formatMoney(item.profit),
            ])
          )}

          ${buildHtmlTable(
            "Project Finance Report",
            [
              "Project",
              "Type",
              "Price",
              "Revenue",
              "Expenses",
              "Net Profit",
              "Remaining",
              "Payment",
            ],
            projectsFinance.map((item) => [
              item.project?.name || "-",
              item.project?.type || "-",
              formatMoney(item.project?.price),
              formatMoney(item.totalRevenue),
              formatMoney(item.totalExpenses),
              formatMoney(item.netProfit),
              formatMoney(item.remainingBalance),
              formatPercent(item.paymentProgress),
            ])
          )}

          ${buildHtmlTable(
            "Client Finance Report",
            ["Client", "Projects", "Revenue", "Expenses", "Net Profit"],
            clientsFinance.map((item) => [
              item.client?.companyName || "-",
              item.totalProjects,
              formatMoney(item.totalRevenue),
              formatMoney(item.totalExpenses),
              formatMoney(item.netProfit),
            ])
          )}

          ${buildHtmlTable(
            "Project Type Report",
            [
              "Type",
              "Projects",
              "Total Value",
              "Revenue",
              "Expenses",
              "Net Profit",
            ],
            projectTypesFinance.map((item) => [
              item.type,
              item.projectCount,
              formatMoney(item.totalProjectValue),
              formatMoney(item.totalRevenue),
              formatMoney(item.totalExpenses),
              formatMoney(item.netProfit),
            ])
          )}
        </body>
      </html>
    `;

    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();

    setTimeout(() => {
      reportWindow.print();
    }, 300);
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "stretch", md: "flex-start" },
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Reports
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Business performance reports based on revenue, expenses, projects,
            clients, and sales conversion.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }} useFlexGap>
          <Button variant="contained" onClick={handleExportExcel}>
            Export Excel
          </Button>

          <Button variant="outlined" color="secondary" onClick={handlePrintPdf}>
            Print / PDF
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            lg: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <ReportCard
          title="Total Revenue"
          value={formatMoney(summary.totalRevenue)}
        />
        <ReportCard
          title="Total Expenses"
          value={formatMoney(summary.totalExpenses)}
        />
        <ReportCard title="Net Profit" value={formatMoney(summary.netProfit)} />
        <ReportCard title="Profit Margin" value={formatPercent(profitMargin)} />
        <ReportCard title="Total Deals" value={salesStats.totalDeals} />
        <ReportCard title="Closed Won" value={salesStats.closedWon} />
        <ReportCard
          title="Conversion Rate"
          value={formatPercent(salesStats.conversionRate)}
        />
        <ReportCard
          title="Avg Project Value"
          value={formatMoney(averageProjectValue)}
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2,
          mb: 3,
        }}
      >
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Best Client
            </Typography>

            {bestClient ? (
              <>
                <Typography sx={{ fontWeight: 600 }}>
                  {bestClient.client?.companyName || "-"}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  Revenue: {formatMoney(bestClient.totalRevenue)}
                </Typography>
                <Typography color="text.secondary">
                  Net Profit: {formatMoney(bestClient.netProfit)}
                </Typography>
              </>
            ) : (
              <Typography color="text.secondary">
                No client finance data.
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Best Project Type
            </Typography>

            {bestProjectType ? (
              <>
                <Typography sx={{ fontWeight: 600 }}>
                  {bestProjectType.type}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  Revenue: {formatMoney(bestProjectType.totalRevenue)}
                </Typography>
                <Typography color="text.secondary">
                  Projects: {bestProjectType.projectCount}
                </Typography>
              </>
            ) : (
              <Typography color="text.secondary">
                No project type finance data.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      <ReportTable title="Monthly Finance">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Month</TableCell>
              <TableCell>Revenue</TableCell>
              <TableCell>Expenses</TableCell>
              <TableCell>Profit</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {monthly.length === 0 ? (
              <EmptyTableRow colSpan={4} message="No monthly finance data." />
            ) : (
              monthly.map((item) => (
                <TableRow key={item.month} hover>
                  <TableCell>{item.month}</TableCell>
                  <TableCell>{formatMoney(item.revenue)}</TableCell>
                  <TableCell>{formatMoney(item.expenses)}</TableCell>
                  <TableCell>{formatMoney(item.profit)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ReportTable>

      <ReportTable title="Project Finance Report">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Project</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Revenue</TableCell>
              <TableCell>Expenses</TableCell>
              <TableCell>Net Profit</TableCell>
              <TableCell>Remaining</TableCell>
              <TableCell>Payment</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {projectsFinance.length === 0 ? (
              <EmptyTableRow colSpan={7} message="No project finance data." />
            ) : (
              projectsFinance.map((item, index) => (
                <TableRow
                  key={`${
                    item.project?._id || item.project?.name || "project"
                  }-${index}`}
                  hover
                >
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>
                      {item.project?.name || "-"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.project?.type || "-"}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatMoney(item.project?.price)}</TableCell>
                  <TableCell>{formatMoney(item.totalRevenue)}</TableCell>
                  <TableCell>{formatMoney(item.totalExpenses)}</TableCell>
                  <TableCell>{formatMoney(item.netProfit)}</TableCell>
                  <TableCell>{formatMoney(item.remainingBalance)}</TableCell>
                  <TableCell>
                    <Chip
                      label={formatPercent(item.paymentProgress)}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ReportTable>

      <ReportTable title="Client Finance Report">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Client</TableCell>
              <TableCell>Projects</TableCell>
              <TableCell>Revenue</TableCell>
              <TableCell>Expenses</TableCell>
              <TableCell>Net Profit</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {clientsFinance.length === 0 ? (
              <EmptyTableRow colSpan={5} message="No client finance data." />
            ) : (
              clientsFinance.map((item, index) => (
                <TableRow
                  key={`${
                    item.client?._id || item.client?.companyName || "client"
                  }-${index}`}
                  hover
                >
                  <TableCell>{item.client?.companyName || "-"}</TableCell>
                  <TableCell>{item.totalProjects}</TableCell>
                  <TableCell>{formatMoney(item.totalRevenue)}</TableCell>
                  <TableCell>{formatMoney(item.totalExpenses)}</TableCell>
                  <TableCell>{formatMoney(item.netProfit)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ReportTable>

      <ReportTable title="Project Type Report">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Projects</TableCell>
              <TableCell>Total Value</TableCell>
              <TableCell>Revenue</TableCell>
              <TableCell>Expenses</TableCell>
              <TableCell>Net Profit</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {projectTypesFinance.length === 0 ? (
              <EmptyTableRow colSpan={6} message="No project type data." />
            ) : (
              projectTypesFinance.map((item) => (
                <TableRow key={item.type} hover>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.projectCount}</TableCell>
                  <TableCell>{formatMoney(item.totalProjectValue)}</TableCell>
                  <TableCell>{formatMoney(item.totalRevenue)}</TableCell>
                  <TableCell>{formatMoney(item.totalExpenses)}</TableCell>
                  <TableCell>{formatMoney(item.netProfit)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ReportTable>
    </Box>
  );
}

function ReportCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography color="text.secondary">{title}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function ReportTable({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card sx={{ borderRadius: 3, mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          {title}
        </Typography>

        <Box sx={{ overflowX: "auto" }}>{children}</Box>
      </CardContent>
    </Card>
  );
}

function EmptyTableRow({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan}>
        <Typography color="text.secondary" sx={{ py: 2 }}>
          {message}
        </Typography>
      </TableCell>
    </TableRow>
  );
}