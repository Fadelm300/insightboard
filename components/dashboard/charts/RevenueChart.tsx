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
  const gridColor = alpha(theme.palette.text.secondary, 0.16);

  return (
    <Card sx={{ height: "100%", minWidth: 0 }}>
      <CardContent sx={{ p: 2.5, minWidth: 0 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6">Monthly Revenue</Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            Revenue, expenses, and profit trend by month.
          </Typography>
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
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={revenueColor}
                      stopOpacity={0.42}
                    />
                    <stop
                      offset="95%"
                      stopColor={revenueColor}
                      stopOpacity={0.02}
                    />
                  </linearGradient>

                  <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={profitColor}
                      stopOpacity={0.28}
                    />
                    <stop
                      offset="95%"
                      stopColor={profitColor}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />

                <XAxis
                  dataKey="month"
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={{ stroke: gridColor }}
                />

                <YAxis
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={{ stroke: gridColor }}
                />

                <Tooltip
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
                    fontWeight: 800,
                  }}
                  itemStyle={{
                    color: theme.palette.text.primary,
                  }}
                />

                <Legend
                  wrapperStyle={{
                    color: theme.palette.text.secondary,
                    fontWeight: 700,
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={revenueColor}
                  fill="url(#revenueFill)"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />

                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke={expensesColor}
                  fill="transparent"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />

                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke={profitColor}
                  fill="url(#profitFill)"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            )}
          </MeasuredChartBox>
        )}
      </CardContent>
    </Card>
  );
}