"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Typography,
} from "@mui/material";

import { apiFetch } from "@/lib/apiClient";

type FinanceSummary = {
  totalRevenue?: number;
  totalExpenses?: number;
  netProfit?: number;
  revenueCount?: number;
  expenseCount?: number;
};

type FinanceSummaryResponse = {
  success?: boolean;
  message?: string;
  data?: FinanceSummary;
  totalRevenue?: number;
  totalExpenses?: number;
  netProfit?: number;
  revenueCount?: number;
  expenseCount?: number;
};

function getSummaryFromResponse(response: FinanceSummaryResponse): FinanceSummary {
  const data = response.data ?? response;

  return {
    totalRevenue: Number(data.totalRevenue ?? 0),
    totalExpenses: Number(data.totalExpenses ?? 0),
    netProfit: Number(data.netProfit ?? 0),
    revenueCount: Number(data.revenueCount ?? 0),
    expenseCount: Number(data.expenseCount ?? 0),
  };
}

function formatCurrency(value?: number) {
  return `BHD ${Number(value ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function RevenueSummary() {
  const [summary, setSummary] = useState<FinanceSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    revenueCount: 0,
    expenseCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchSummary() {
      try {
        setError("");

        const response = await apiFetch<FinanceSummaryResponse>(
          "/api/finance/summary"
        );

        setSummary(getSummaryFromResponse(response));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load revenue summary";

        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, []);

  const summaryItems = [
    {
      label: "Total Revenue",
      value: formatCurrency(summary.totalRevenue),
    },
    {
      label: "Total Expenses",
      value: formatCurrency(summary.totalExpenses),
    },
    {
      label: "Net Profit",
      value: formatCurrency(summary.netProfit),
    },
    {
      label: "Revenue Records",
      value: summary.revenueCount ?? 0,
    },
    {
      label: "Expense Records",
      value: summary.expenseCount ?? 0,
    },
  ];

  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
        height: "100%",
      }}
    >
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Revenue Summary
        </Typography>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!loading && error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading &&
          !error &&
          summaryItems.map((item, index) => (
            <Box key={item.label}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  py: 1.5,
                  gap: 2,
                }}
              >
                <Typography color="text.secondary">{item.label}</Typography>

                <Typography
                  sx={{
                    fontWeight: 700,
                    textAlign: "right",
                  }}
                >
                  {item.value}
                </Typography>
              </Box>

              {index !== summaryItems.length - 1 && <Divider />}
            </Box>
          ))}
      </CardContent>
    </Card>
  );
}