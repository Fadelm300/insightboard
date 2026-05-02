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

  const gridColor = alpha(theme.palette.text.secondary, 0.16);

  return (
    <Card sx={{ height: "100%", minWidth: 0 }}>
      <CardContent sx={{ p: 2.5, minWidth: 0 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6">Deals Pipeline</Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            Count of deals across each sales stage.
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

        {!loading && !error && (
          <MeasuredChartBox height={330}>
            {({ width, height }) => (
              <BarChart
                width={width}
                height={height}
                data={chartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />

                <XAxis
                  dataKey="status"
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={{ stroke: gridColor }}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={{ stroke: gridColor }}
                />

                <Tooltip
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
                    fontWeight: 800,
                  }}
                  itemStyle={{
                    color: theme.palette.text.primary,
                  }}
                />

                <Bar dataKey="deals" radius={[10, 10, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.fullStatus} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </MeasuredChartBox>
        )}
      </CardContent>
    </Card>
  );
}