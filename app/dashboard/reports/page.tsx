"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

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

function formatPercent(value?: number) {
  return `${Number(value || 0).toFixed(1)}%`;
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
          "months",
          "items",
          "records",
        ])
      );

      setProjectsFinance(
        extractList<ProjectFinance>(projectsFinanceResponse, [
          "projects",
          "projectFinance",
          "items",
          "records",
        ])
      );

      setClientsFinance(
        extractList<ClientFinance>(clientsFinanceResponse, [
          "clients",
          "clientFinance",
          "items",
          "records",
        ])
      );

      setProjectTypesFinance(
        extractList<ProjectTypeFinance>(projectTypesResponse, [
          "projectTypes",
          "types",
          "items",
          "records",
        ])
      );

      setDeals(
        extractList<Deal>(dealsResponse, ["deals", "items", "records"])
      );
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
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Reports
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Business performance reports based on revenue, expenses, projects,
          clients, and sales conversion.
        </Typography>
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
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography color="text.secondary">Total Revenue</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
              {formatMoney(summary.totalRevenue)}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography color="text.secondary">Total Expenses</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
              {formatMoney(summary.totalExpenses)}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography color="text.secondary">Net Profit</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
              {formatMoney(summary.netProfit)}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography color="text.secondary">Profit Margin</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
              {formatPercent(profitMargin)}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography color="text.secondary">Total Deals</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
              {salesStats.totalDeals}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography color="text.secondary">Closed Won</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
              {salesStats.closedWon}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography color="text.secondary">Conversion Rate</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
              {formatPercent(salesStats.conversionRate)}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography color="text.secondary">Avg Project Value</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
              {formatMoney(averageProjectValue)}
            </Typography>
          </CardContent>
        </Card>
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
              <Typography color="text.secondary">No client finance data.</Typography>
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
            {monthly.map((item) => (
              <TableRow key={item.month} hover>
                <TableCell>{item.month}</TableCell>
                <TableCell>{formatMoney(item.revenue)}</TableCell>
                <TableCell>{formatMoney(item.expenses)}</TableCell>
                <TableCell>{formatMoney(item.profit)}</TableCell>
              </TableRow>
            ))}
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
            {projectsFinance.map((item) => (
              <TableRow key={item.project?._id || item.project?.name} hover>
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
            ))}
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
            {clientsFinance.map((item) => (
              <TableRow key={item.client?._id || item.client?.companyName} hover>
                <TableCell>{item.client?.companyName || "-"}</TableCell>
                <TableCell>{item.totalProjects}</TableCell>
                <TableCell>{formatMoney(item.totalRevenue)}</TableCell>
                <TableCell>{formatMoney(item.totalExpenses)}</TableCell>
                <TableCell>{formatMoney(item.netProfit)}</TableCell>
              </TableRow>
            ))}
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
            {projectTypesFinance.map((item) => (
              <TableRow key={item.type} hover>
                <TableCell>{item.type}</TableCell>
                <TableCell>{item.projectCount}</TableCell>
                <TableCell>{formatMoney(item.totalProjectValue)}</TableCell>
                <TableCell>{formatMoney(item.totalRevenue)}</TableCell>
                <TableCell>{formatMoney(item.totalExpenses)}</TableCell>
                <TableCell>{formatMoney(item.netProfit)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ReportTable>
    </Box>
  );
}

function ReportTable({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
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