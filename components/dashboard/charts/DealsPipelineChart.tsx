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
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { apiFetch } from "@/lib/apiClient";

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

export default function DealsPipelineChart() {
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
    }));
  }, [deals]);

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
          Deals Pipeline
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

        {!loading && !error && (
          <Box
            sx={{
              width: "100%",
              height: 300,
              minWidth: 0,
              minHeight: 300,
            }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis allowDecimals={false} />
                <Tooltip
                  formatter={(value) => [value, "Deals"]}
                  labelFormatter={(_, payload) => {
                    const item = payload?.[0]?.payload;
                    return item?.fullStatus || "Status";
                  }}
                />
                <Bar dataKey="deals" fill="#2e7d32" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}