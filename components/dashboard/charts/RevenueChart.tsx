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
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { apiFetch } from "@/lib/apiClient";

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
    if (Array.isArray(response.data.monthlyData)) return response.data.monthlyData;
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

  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
        height: "100%",
        minWidth: 0,
      }}
    >
      <CardContent sx={{ minWidth: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Monthly Revenue
        </Typography>

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
          <Box
            sx={{
              width: "100%",
              height: 300,
              minWidth: 0,
              minHeight: 300,
            }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    formatMetricName(String(name)),
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1976d2"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#d32f2f"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#2e7d32"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}