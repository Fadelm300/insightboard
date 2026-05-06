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
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

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
  const theme = useTheme();

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
    <Card
      sx={{
        borderRadius: 4,
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
                  0.13
                )}, transparent 36%),
                 radial-gradient(circle at 86% 18%, ${alpha(
                   theme.palette.info.main,
                   0.08
                 )}, transparent 34%)`
              : `radial-gradient(circle at 18% 14%, ${alpha(
                  theme.palette.primary.main,
                  0.07
                )}, transparent 36%),
                 radial-gradient(circle at 86% 18%, ${alpha(
                   theme.palette.info.main,
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
            mb: 2,
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
              Recent Deals
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
              Latest sales opportunities in your pipeline.
            </Typography>
          </Box>

          {!loading && !error && deals.length > 0 && (
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
              Latest {deals.length}
            </Box>
          )}
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : deals.length === 0 ? (
          <Typography color="text.secondary">No deals yet.</Typography>
        ) : (
          <TableContainer
            sx={{
              width: "100%",
              maxWidth: "100%",
              overflowX: "hidden",
            }}
          >
            <Table
              size="small"
              sx={{
                width: "100%",
                tableLayout: "fixed",
              }}
            >
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? alpha(theme.palette.primary.main, 0.08)
                        : alpha(theme.palette.primary.main, 0.04),
                  }}
                >
                  <TableCell
                    sx={{
                      width: { xs: "58%", md: "40%" },
                      px: { xs: 1.25, md: 2 },
                      py: 1.5,
                      fontSize: 12,
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Deal
                  </TableCell>

                  <TableCell
                    sx={{
                      display: { xs: "none", md: "table-cell" },
                      width: "24%",
                      px: 2,
                      py: 1.5,
                      fontSize: 12,
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Client
                  </TableCell>

                  <TableCell
                    sx={{
                      display: { xs: "none", sm: "table-cell" },
                      width: { sm: "24%", md: "20%" },
                      px: { sm: 1.25, md: 2 },
                      py: 1.5,
                      fontSize: 12,
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Status
                  </TableCell>

                  <TableCell
                    align="right"
                    sx={{
                      width: { xs: "42%", sm: "24%", md: "16%" },
                      px: { xs: 1.25, md: 2 },
                      py: 1.5,
                      fontSize: 12,
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Value
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {deals.map((deal) => (
                  <TableRow
                    key={deal._id}
                    hover
                    sx={{
                      "&:last-child td": {
                        borderBottom: 0,
                      },
                    }}
                  >
                    <TableCell
                      sx={{
                        px: { xs: 1.25, md: 2 },
                        py: { xs: 1.5, md: 1.75 },
                        minWidth: 0,
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontWeight: 900,
                            fontSize: { xs: 13, md: 14 },
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {deal.title}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mt: 0.35,
                            fontSize: { xs: 11.5, md: 12 },
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Probability: {deal.probability || 0}%
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mt: 0.25,
                            display: { xs: "block", md: "none" },
                            fontSize: 11.5,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {getClientName(deal.clientId)}
                        </Typography>

                        <Chip
                          label={deal.status}
                          color={getStatusColor(deal.status)}
                          size="small"
                          sx={{
                            display: { xs: "inline-flex", sm: "none" },
                            mt: 0.75,
                            height: 24,
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 800,
                            maxWidth: "100%",
                            "& .MuiChip-label": {
                              px: 0.75,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            },
                          }}
                        />
                      </Box>
                    </TableCell>

                    <TableCell
                      sx={{
                        display: { xs: "none", md: "table-cell" },
                        px: 2,
                        py: 1.75,
                        color: "text.secondary",
                        fontWeight: 700,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {getClientName(deal.clientId)}
                    </TableCell>

                    <TableCell
                      sx={{
                        display: { xs: "none", sm: "table-cell" },
                        px: { sm: 1.25, md: 2 },
                        py: 1.75,
                      }}
                    >
                      <Chip
                        label={deal.status}
                        color={getStatusColor(deal.status)}
                        size="small"
                        sx={{
                          height: 26,
                          borderRadius: 999,
                          fontWeight: 800,
                          maxWidth: "100%",
                          "& .MuiChip-label": {
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          },
                        }}
                      />
                    </TableCell>

                    <TableCell
                      align="right"
                      sx={{
                        px: { xs: 1.25, md: 2 },
                        py: 1.75,
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                        fontSize: { xs: 12, md: 14 },
                      }}
                    >
                      {formatMoney(getDealAmount(deal))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}
