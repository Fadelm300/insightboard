"use client";

import { useEffect, useState } from "react";
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

type Client = {
  _id: string;
  companyName: string;
  contactPerson?: string;
  email?: string;
};

type Deal = {
  _id: string;
  title: string;
  status: string;
  estimatedBudget?: number;
  finalPrice?: number;
  probability?: number;
  clientId?: Client | string;
  createdAt?: string;
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

function getDealsFromResponse(response: DealsResponse): Deal[] {
  if (Array.isArray(response.data)) return response.data;

  if (response.data && !Array.isArray(response.data)) {
    if (Array.isArray(response.data.deals)) return response.data.deals;
    if (Array.isArray(response.data.items)) return response.data.items;
    if (Array.isArray(response.data.records)) return response.data.records;
  }

  if (Array.isArray(response.deals)) return response.deals;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.records)) return response.records;

  return [];
}

function getClientName(clientId?: Client | string) {
  if (typeof clientId === "object" && clientId?.companyName) {
    return clientId.companyName;
  }

  return "-";
}

function formatMoney(value?: number) {
  return `${Number(value || 0).toFixed(2)} BHD`;
}

function getDealAmount(deal: Deal) {
  return deal.finalPrice && deal.finalPrice > 0
    ? deal.finalPrice
    : deal.estimatedBudget || 0;
}

function getStatusColor(
  status: string
):
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning" {
  if (status === "Closed Won") return "success";
  if (status === "Closed Lost") return "error";
  if (status === "Negotiation") return "warning";
  if (status === "Proposal Sent") return "secondary";
  if (status === "Contacted") return "info";
  if (status === "Lead") return "default";

  return "default";
}

export default function RecentDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchDeals() {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch<DealsResponse>("/api/deals");
      const allDeals = getDealsFromResponse(response);

      setDeals(allDeals.slice(0, 5));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load recent deals";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDeals();
  }, []);

  return (
    <Card sx={{ borderRadius: 3, height: "100%" }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Recent Deals
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : deals.length === 0 ? (
          <Typography color="text.secondary">No deals yet.</Typography>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Deal</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Value</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {deals.map((deal) => (
                  <TableRow key={deal._id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>
                        {deal.title}
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        Probability: {deal.probability || 0}%
                      </Typography>
                    </TableCell>

                    <TableCell>{getClientName(deal.clientId)}</TableCell>

                    <TableCell>
                      <Chip
                        label={deal.status}
                        color={getStatusColor(deal.status)}
                        size="small"
                      />
                    </TableCell>

                    <TableCell align="right">
                      {formatMoney(getDealAmount(deal))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}