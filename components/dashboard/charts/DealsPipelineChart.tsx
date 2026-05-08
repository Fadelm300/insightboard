"use client";

import { useEffect, useMemo, useState } from "react";
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
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { apiFetch } from "@/lib/apiClient";
import MeasuredChartBox from "@/components/dashboard/charts/MeasuredChartBox";

type Deal = {
  _id: string;
  title: string;
  status?: string;
};

type DealsResponse = {
  success?: boolean;
  message?: string;
  data?:
    | Deal[]
    | {
        deals?: Deal[];
        items?: Deal[];
        records?: Deal[];
      };
  deals?: Deal[];
  items?: Deal[];
  records?: Deal[];
};

const DEAL_STATUS_ORDER = [
  "Lead",
  "Contacted",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];

function getDealsFromResponse(response: DealsResponse): Deal[] {
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.deals)) return response.deals;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.records)) return response.records;

  if (response.data && !Array.isArray(response.data)) {
    if (Array.isArray(response.data.deals)) return response.data.deals;
    if (Array.isArray(response.data.items)) return response.data.items;
    if (Array.isArray(response.data.records)) return response.data.records;
  }

  return [];
}

function getShortStatusLabel(status: string) {
  if (status === "Proposal Sent") return "Proposal";
  if (status === "Closed Won") return "Won";
  if (status === "Closed Lost") return "Lost";
  return status;
}

function getStatusColor(status: string) {
  if (status === "Closed Won") return "#10B981";
  if (status === "Closed Lost") return "#EF4444";
  if (status === "Negotiation") return "#F59E0B";
  if (status === "Proposal Sent") return "#8B5CF6";
  if (status === "Contacted") return "#0EA5E9";
  return "#64748B";
}

export default function DealsPipelineChart() {
  const theme = useTheme();

  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDeals() {
      try {
        setError("");

        const response = await apiFetch<DealsResponse>("/api/deals");
        setDeals(getDealsFromResponse(response));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load deals pipeline";

        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchDeals();
  }, []);

  const chartData = useMemo(() => {
    const counts = deals.reduce<Record<string, number>>((acc, deal) => {
      const status = deal.status || "Lead";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return DEAL_STATUS_ORDER.map((status) => ({
      status: getShortStatusLabel(status),
      fullStatus: status,
      deals: counts[status] || 0,
      color: getStatusColor(status),
    }));
  }, [deals]);

  const gridColor = alpha(theme.palette.text.secondary, 0.13);
  const axisColor = alpha(theme.palette.text.secondary, 0.62);
  const totalDeals = chartData.reduce((total, item) => total + item.deals, 0);

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
                  theme.palette.primary.main,
                  0.14
                )}, transparent 36%),
                 radial-gradient(circle at 86% 18%, ${alpha(
                   theme.palette.info.main,
                   0.1
                 )}, transparent 34%)`
              : `radial-gradient(circle at 18% 14%, ${alpha(
                  theme.palette.primary.main,
                  0.08
                )}, transparent 36%),
                 radial-gradient(circle at 86% 18%, ${alpha(
                   theme.palette.info.main,
                   0.08
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
              Deals Pipeline
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
              Count of deals across each sales stage.
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
                color: "primary.light",
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
                boxShadow:
                  theme.palette.mode === "dark"
                    ? `0 0 24px ${alpha(theme.palette.primary.main, 0.16)}`
                    : `0 10px 26px ${alpha(theme.palette.primary.main, 0.1)}`,
              }}
            >
              {totalDeals} Deals
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

        {!loading && !error && (
          <Box
            sx={{
              position: "relative",
              borderRadius: 4,
              p: { xs: 1, md: 1.5 },
              overflow: "hidden",
              bgcolor:
                theme.palette.mode === "dark"
                  ? alpha(theme.palette.common.white, 0.025)
                  : alpha(theme.palette.primary.main, 0.025),
              boxShadow:
                theme.palette.mode === "dark"
                  ? `inset 0 1px 0 ${alpha(
                      theme.palette.common.white,
                      0.08
                    )}, 0 22px 48px ${alpha(theme.palette.common.black, 0.24)}`
                  : `inset 0 1px 0 ${alpha(
                      theme.palette.common.white,
                      0.9
                    )}, 0 22px 48px ${alpha(theme.palette.primary.main, 0.1)}`,
              "&::before": {
                content: '""',
                position: "absolute",
                inset: "12px 18px auto 18px",
                height: 42,
                borderRadius: 999,
                background: `linear-gradient(90deg, ${alpha(
                  theme.palette.primary.main,
                  0.16
                )}, ${alpha(theme.palette.info.main, 0.12)}, ${alpha(
                  theme.palette.success.main,
                  0.1
                )})`,
                filter: "blur(18px)",
                opacity: 0.9,
                pointerEvents: "none",
              },
              "&::after": {
                content: '""',
                position: "absolute",
                left: 42,
                right: 42,
                bottom: 34,
                height: 18,
                borderRadius: "50%",
                background:
                  theme.palette.mode === "dark"
                    ? alpha(theme.palette.common.black, 0.28)
                    : alpha(theme.palette.primary.main, 0.1),
                filter: "blur(15px)",
                transform: "perspective(700px) rotateX(58deg)",
                pointerEvents: "none",
              },
            }}
          >
            <MeasuredChartBox height={330}>
              {({ width, height }) => (
                <BarChart
                  width={width}
                  height={height}
                  data={chartData}
                  margin={{ top: 18, right: 18, left: 0, bottom: 4 }}
                  barCategoryGap="28%"
                >
                  <defs>
                    <filter
                      id="dealsPipelineBarShadow"
                      x="-25%"
                      y="-25%"
                      width="150%"
                      height="150%"
                    >
                      <feDropShadow
                        dx="0"
                        dy="9"
                        stdDeviation="6"
                        floodColor={alpha(theme.palette.common.black, 0.28)}
                      />
                    </filter>

                    {chartData.map((entry, index) => (
                      <linearGradient
                        key={`gradient-${entry.fullStatus}`}
                        id={`dealPipelineGradient${index}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={entry.color}
                          stopOpacity={0.96}
                        />
                        <stop
                          offset="100%"
                          stopColor={entry.color}
                          stopOpacity={0.52}
                        />
                      </linearGradient>
                    ))}
                  </defs>

                  <CartesianGrid
                    strokeDasharray="4 10"
                    vertical={false}
                    stroke={gridColor}
                  />

                  <XAxis
                    dataKey="status"
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
                    allowDecimals={false}
                    tick={{
                      fill: axisColor,
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                  />

                  <Tooltip
                    cursor={{
                      fill: alpha(theme.palette.primary.main, 0.06),
                    }}
                    formatter={(value) => [value, "Deals"]}
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload;
                      return item?.fullStatus || "Status";
                    }}
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

                  <Bar
                    dataKey="deals"
                    radius={[12, 12, 4, 4]}
                    maxBarSize={56}
                    filter="url(#dealsPipelineBarShadow)"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={entry.fullStatus}
                        fill={`url(#dealPipelineGradient${index})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </MeasuredChartBox>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
