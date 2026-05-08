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
import { alpha, useTheme } from "@mui/material/styles";

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
  const theme = useTheme();

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

  const netProfit = Number(summary.netProfit ?? 0);
  const profitColor =
    netProfit >= 0 ? theme.palette.success.main : theme.palette.error.main;

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
      highlight: true,
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
              ? `radial-gradient(circle at 18% 14%, ${alpha(
                  theme.palette.success.main,
                  0.13
                )}, transparent 36%),
                 radial-gradient(circle at 86% 18%, ${alpha(
                   theme.palette.primary.main,
                   0.1
                 )}, transparent 34%)`
              : `radial-gradient(circle at 18% 14%, ${alpha(
                  theme.palette.success.main,
                  0.07
                )}, transparent 36%),
                 radial-gradient(circle at 86% 18%, ${alpha(
                   theme.palette.primary.main,
                   0.06
                 )}, transparent 34%)`,
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
            flexDirection: { xs: "column", sm: "row", xl: "column" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center", xl: "flex-start" },
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
              Revenue Summary
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
              Financial snapshot across revenue and expenses.
            </Typography>
          </Box>

          {!loading && !error && (
            <Box
              sx={{
                px: 1.4,
                py: 0.75,
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 900,
                color: netProfit >= 0 ? "success.main" : "error.main",
                bgcolor: alpha(
                  profitColor,
                  theme.palette.mode === "dark" ? 0.14 : 0.1
                ),
                border: `1px solid ${alpha(profitColor, 0.24)}`,
                boxShadow:
                  theme.palette.mode === "dark"
                    ? `0 0 24px ${alpha(profitColor, 0.14)}`
                    : `0 10px 26px ${alpha(profitColor, 0.1)}`,
              }}
            >
              {netProfit >= 0 ? "Profit" : "Loss"}
            </Box>
          )}
        </Box>

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
                  alignItems: { xs: "flex-start", sm: "center" },
                  flexDirection: { xs: "column", sm: "row" },
                  py: { xs: 1.35, md: 1.55 },
                  px: item.highlight ? { xs: 1.2, md: 1.35 } : 0,
                  gap: { xs: 0.5, sm: 2 },
                  borderRadius: item.highlight ? 999 : 0,
                  bgcolor: item.highlight
                    ? alpha(
                        profitColor,
                        theme.palette.mode === "dark" ? 0.16 : 0.09
                      )
                    : "transparent",
                  border: item.highlight
                    ? `1px solid ${alpha(profitColor, 0.2)}`
                    : "none",
                  boxShadow: item.highlight
                    ? theme.palette.mode === "dark"
                      ? `0 0 26px ${alpha(profitColor, 0.1)}`
                      : `0 12px 28px ${alpha(profitColor, 0.08)}`
                    : "none",
                }}
              >
                <Typography
                  color="text.secondary"
                  sx={{
                    fontWeight: item.highlight ? 900 : 750,
                    fontSize: { xs: 13, md: 14 },
                  }}
                >
                  {item.label}
                </Typography>

                <Typography
                  sx={{
                    fontWeight: 950,
                    textAlign: { xs: "left", sm: "right" },
                    color: item.highlight ? profitColor : "text.primary",
                    fontSize: item.highlight
                      ? { xs: 15, md: 16 }
                      : { xs: 14, md: 15 },
                    wordBreak: "break-word",
                  }}
                >
                  {item.value}
                </Typography>
              </Box>

              {index !== summaryItems.length - 1 && (
                <Divider
                  sx={{
                    borderColor: alpha(theme.palette.divider, 0.68),
                  }}
                />
              )}
            </Box>
          ))}
      </CardContent>
    </Card>
  );
}
