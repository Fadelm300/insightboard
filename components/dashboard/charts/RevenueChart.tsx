"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { apiFetch } from "@/lib/apiClient";
import MeasuredChartBox from "@/components/dashboard/charts/MeasuredChartBox";

type MonthlyFinance = {
  month: string;
  revenue?: number;
  expenses?: number;
  profit?: number;
  revenueCount?: number;
  expenseCount?: number;
};

type MonthlyFinanceResponse = {
  success?: boolean;
  message?: string;
  data?:
    | MonthlyFinance[]
    | {
        monthly?: MonthlyFinance[];
        monthlyData?: MonthlyFinance[];
        months?: MonthlyFinance[];
        items?: MonthlyFinance[];
        records?: MonthlyFinance[];
      };
  monthly?: MonthlyFinance[];
  monthlyData?: MonthlyFinance[];
  months?: MonthlyFinance[];
  items?: MonthlyFinance[];
  records?: MonthlyFinance[];
};

function extractMonthlyArray(response: MonthlyFinanceResponse): MonthlyFinance[] {
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.monthly)) return response.monthly;
  if (Array.isArray(response.monthlyData)) return response.monthlyData;
  if (Array.isArray(response.months)) return response.months;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.records)) return response.records;

  if (response.data && !Array.isArray(response.data)) {
    if (Array.isArray(response.data.monthly)) return response.data.monthly;
    if (Array.isArray(response.data.monthlyData)) {
      return response.data.monthlyData;
    }
    if (Array.isArray(response.data.months)) return response.data.months;
    if (Array.isArray(response.data.items)) return response.data.items;
    if (Array.isArray(response.data.records)) return response.data.records;
  }

  return [];
}

function getMonthlyDataFromResponse(
  response: MonthlyFinanceResponse
): MonthlyFinance[] {
  const data = extractMonthlyArray(response);

  return data.map((item) => ({
    month: item.month,
    revenue: Number(item.revenue ?? 0),
    expenses: Number(item.expenses ?? 0),
    profit: Number(item.profit ?? 0),
    revenueCount: Number(item.revenueCount ?? 0),
    expenseCount: Number(item.expenseCount ?? 0),
  }));
}

function formatCurrency(value: number) {
  return `BHD ${Number(value ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatMetricName(name: string) {
  if (name === "revenue") return "Revenue";
  if (name === "expenses") return "Expenses";
  if (name === "profit") return "Profit";
  return name;
}

export default function RevenueChart() {
  const theme = useTheme();

  const [monthlyData, setMonthlyData] = useState<MonthlyFinance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMonthlyFinance() {
      try {
        setError("");

        const response = await apiFetch<MonthlyFinanceResponse>(
          "/api/finance/monthly"
        );

        setMonthlyData(getMonthlyDataFromResponse(response));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load monthly revenue";

        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchMonthlyFinance();
  }, []);

  const revenueColor = theme.palette.primary.light;
  const expensesColor = theme.palette.error.main;
  const profitColor = theme.palette.success.main;
  const gridColor = alpha(theme.palette.text.secondary, 0.12);
  const axisColor = alpha(theme.palette.text.secondary, 0.62);

  return (
    <Card
      sx={{
        height: "100%",
        minWidth: 0,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            theme.palette.mode === "dark"
              ? `radial-gradient(circle at 18% 12%, ${alpha(
                  theme.palette.primary.main,
                  0.14
                )}, transparent 36%),
                 radial-gradient(circle at 82% 16%, ${alpha(
                   theme.palette.success.main,
                   0.1
                 )}, transparent 32%)`
              : `radial-gradient(circle at 18% 12%, ${alpha(
                  theme.palette.primary.main,
                  0.08
                )}, transparent 36%),
                 radial-gradient(circle at 82% 16%, ${alpha(
                   theme.palette.success.main,
                   0.08
                 )}, transparent 32%)`,
        }}
      />

      <CardContent
        sx={{
          position: "relative",
          p: { xs: 2, md: 2.5 },
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            mb: 2.5,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 1.5,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 900,
                letterSpacing: "-0.03em",
              }}
            >
              Monthly Revenue
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
              Revenue, expenses, and profit trend by month.
            </Typography>
          </Box>

          {!loading && !error && monthlyData.length > 0 && (
            <Box
              sx={{
                display: { xs: "none", sm: "flex" },
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Box
                sx={{
                  px: 1.25,
                  py: 0.65,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 900,
                  color: "primary.light",
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
                }}
              >
                Revenue
              </Box>

              <Box
                sx={{
                  px: 1.25,
                  py: 0.65,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 900,
                  color: "success.main",
                  bgcolor: alpha(theme.palette.success.main, 0.12),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.22)}`,
                }}
              >
                Profit
              </Box>

              <Box
                sx={{
                  px: 1.25,
                  py: 0.65,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 900,
                  color: "error.main",
                  bgcolor: alpha(theme.palette.error.main, 0.12),
                  border: `1px solid ${alpha(theme.palette.error.main, 0.22)}`,
                }}
              >
                Expenses
              </Box>
            </Box>
          )}
        </Box>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!loading && error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && monthlyData.length === 0 && (
          <Alert severity="info">No monthly finance data found.</Alert>
        )}

        {!loading && !error && monthlyData.length > 0 && (
          <MeasuredChartBox height={330}>
            {({ width, height }) => (
              <AreaChart
                width={width}
                height={height}
                data={monthlyData}
                margin={{ top: 18, right: 18, left: 0, bottom: 2 }}
              >
                <defs>
                  <linearGradient id="revenueSurface" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={revenueColor}
                      stopOpacity={0.45}
                    />
                    <stop
                      offset="58%"
                      stopColor={revenueColor}
                      stopOpacity={0.12}
                    />
                    <stop
                      offset="100%"
                      stopColor={revenueColor}
                      stopOpacity={0.01}
                    />
                  </linearGradient>

                  <linearGradient id="profitSurface" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={profitColor}
                      stopOpacity={0.34}
                    />
                    <stop
                      offset="62%"
                      stopColor={profitColor}
                      stopOpacity={0.09}
                    />
                    <stop
                      offset="100%"
                      stopColor={profitColor}
                      stopOpacity={0.01}
                    />
                  </linearGradient>

                  <filter id="revenueGlow" x="-25%" y="-25%" width="150%" height="150%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow
                      dx="0"
                      dy="8"
                      stdDeviation="6"
                      floodColor={alpha(theme.palette.common.black, 0.32)}
                    />
                  </filter>
                </defs>

                <CartesianGrid
                  strokeDasharray="4 10"
                  vertical={false}
                  stroke={gridColor}
                />

                <XAxis
                  dataKey="month"
                  tick={{
                    fill: axisColor,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                  axisLine={false}
                  tickLine={false}
                  dy={8}
                />

                <YAxis
                  tick={{
                    fill: axisColor,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />

                <Tooltip
                  cursor={{
                    stroke: alpha(theme.palette.primary.light, 0.28),
                    strokeWidth: 2,
                    strokeDasharray: "4 8",
                  }}
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    formatMetricName(String(name)),
                  ]}
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 14,
                    boxShadow:
                      theme.palette.mode === "dark"
                        ? "0 16px 38px rgba(0,0,0,0.36)"
                        : "0 16px 38px rgba(15,23,42,0.12)",
                  }}
                  labelStyle={{
                    color: theme.palette.text.primary,
                    fontWeight: 900,
                  }}
                  itemStyle={{
                    color: theme.palette.text.primary,
                    fontWeight: 700,
                  }}
                />

                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{
                    color: theme.palette.text.secondary,
                    fontWeight: 800,
                    paddingTop: 14,
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke={revenueColor}
                  fill="url(#revenueSurface)"
                  strokeWidth={4}
                  dot={{
                    r: 4.5,
                    strokeWidth: 2,
                    stroke: theme.palette.background.paper,
                    fill: revenueColor,
                  }}
                  activeDot={{
                    r: 7,
                    strokeWidth: 3,
                    stroke: theme.palette.background.paper,
                    fill: revenueColor,
                  }}
                  filter="url(#revenueGlow)"
                />

                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Profit"
                  stroke={profitColor}
                  fill="url(#profitSurface)"
                  strokeWidth={3.5}
                  dot={{
                    r: 4,
                    strokeWidth: 2,
                    stroke: theme.palette.background.paper,
                    fill: profitColor,
                  }}
                  activeDot={{
                    r: 6.5,
                    strokeWidth: 3,
                    stroke: theme.palette.background.paper,
                    fill: profitColor,
                  }}
                  filter="url(#softShadow)"
                />

                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke={expensesColor}
                  fill="transparent"
                  strokeWidth={3}
                  strokeDasharray="8 7"
                  dot={{
                    r: 4,
                    strokeWidth: 2,
                    stroke: theme.palette.background.paper,
                    fill: expensesColor,
                  }}
                  activeDot={{
                    r: 6,
                    strokeWidth: 3,
                    stroke: theme.palette.background.paper,
                    fill: expensesColor,
                  }}
                />
              </AreaChart>
            )}
          </MeasuredChartBox>
        )}
      </CardContent>
    </Card>
  );
}
