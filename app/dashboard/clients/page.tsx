"use client";

import { useEffect, useMemo, useState } from "react";
import type React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";

import { apiFetch } from "@/lib/apiClient";

type ClientStatus =
  | "New Lead"
  | "Contacted"
  | "Interested"
  | "Not Interested"
  | "Converted";

type Client = {
  _id: string;
  companyName: string;
  businessType?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  location?: string;
  website?: string;
  description?: string;
  notes?: string;
  status: ClientStatus;
  createdAt?: string;
  updatedAt?: string;
};

type ClientFormData = {
  companyName: string;
  businessType: string;
  contactPerson: string;
  phone: string;
  email: string;
  location: string;
  website: string;
  description: string;
  notes: string;
  status: ClientStatus;
};

type ClientFormErrors = Partial<Record<keyof ClientFormData, string>>;

type ClientsResponse = {
  success?: boolean;
  message?: string;
  data?:
    | Client[]
    | {
        clients?: Client[];
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
      };
  clients?: Client[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

const CLIENT_STATUSES: ClientStatus[] = [
  "New Lead",
  "Contacted",
  "Interested",
  "Not Interested",
  "Converted",
];

const emptyForm: ClientFormData = {
  companyName: "",
  businessType: "",
  contactPerson: "",
  phone: "",
  email: "",
  location: "",
  website: "",
  description: "",
  notes: "",
  status: "New Lead",
};
const CLIENTS_PER_PAGE = 7;

const readonlyTextFieldSx: SxProps<Theme> = {
  "& .MuiInputBase-input": {
    cursor: "default",
  },
};

const readonlyMultilineTextFieldSx: SxProps<Theme> = {
  "& .MuiInputBase-input": {
    cursor: "default",
    whiteSpace: "pre-wrap",
  },
};

const tableHeaderCellSx = {
  px: { xs: 0.75, sm: 1, md: 2 },
  py: { xs: 1.25, md: 2 },
  fontSize: { xs: 10, sm: 11, md: 12 },
  fontWeight: 800,
  whiteSpace: "nowrap",
} as const;

const tableBodyCellSx = {
  px: { xs: 0.75, sm: 1, md: 2 },
  py: { xs: 1.25, md: 2 },
} as const;

const hideFromMobileSx = {
  display: { xs: "none", md: "table-cell" },
} as const;

const hideFromTabletSx = {
  display: { xs: "none", lg: "table-cell" },
} as const;

const hideUntilWideSx = {
  display: { xs: "none", xl: "table-cell" },
} as const;

const hideOnPhoneSx = {
  display: { xs: "none", sm: "table-cell" },
} as const;

function getClientsFromResponse(response: ClientsResponse): Client[] {
  if (Array.isArray(response.data)) return response.data;

  if (
    response.data &&
    !Array.isArray(response.data) &&
    Array.isArray(response.data.clients)
  ) {
    return response.data.clients;
  }

  if (Array.isArray(response.clients)) return response.clients;

  return [];
}

function getPaginationFromResponse(response: ClientsResponse) {
  if (response.data && !Array.isArray(response.data)) {
    return {
      total: response.data.total || 0,
      page: response.data.page || 1,
      limit: response.data.limit || CLIENTS_PER_PAGE,
      totalPages: response.data.totalPages || 1,
    };
  }

  return {
    total: response.total || 0,
    page: response.page || 1,
    limit: response.limit || CLIENTS_PER_PAGE,
    totalPages: response.totalPages || 1,
  };
}

function cleanSingleLineText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function cleanMultiLineText(value: string) {
  return value.trim().replace(/[ \t]+/g, " ");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeWebsite(value: string) {
  const cleanValue = value.trim();

  if (!cleanValue) return "";

  if (/^https?:\/\//i.test(cleanValue)) {
    return cleanValue;
  }

  return `https://${cleanValue}`;
}

function hasUnsafeCharacters(value: string) {
  return /[<>{}\[\]`$|\\]/.test(value);
}

function hasUnsafePattern(value: string) {
  return /(javascript:|data:|on\w+\s*=|<\s*script)/i.test(value);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string) {
  return /^[0-9+\-\s()]{6,25}$/.test(value);
}

function isValidWebsite(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateSafeText(
  label: string,
  value: string,
  maxLength: number,
  required = false,
) {
  const cleanValue = cleanSingleLineText(value);

  if (required && !cleanValue) {
    return `${label} is required`;
  }

  if (cleanValue.length > maxLength) {
    return `${label} must be ${maxLength} characters or less`;
  }

  if (hasUnsafeCharacters(cleanValue) || hasUnsafePattern(cleanValue)) {
    return `${label} contains invalid characters`;
  }

  return "";
}

function validateClientForm(data: ClientFormData) {
  const values: ClientFormData = {
    companyName: cleanSingleLineText(data.companyName),
    businessType: cleanSingleLineText(data.businessType),
    contactPerson: cleanSingleLineText(data.contactPerson),
    phone: cleanSingleLineText(data.phone),
    email: normalizeEmail(data.email),
    location: cleanSingleLineText(data.location),
    website: normalizeWebsite(data.website),
    description: cleanMultiLineText(data.description),
    notes: cleanMultiLineText(data.notes),
    status: data.status,
  };

  const errors: ClientFormErrors = {};

  const companyNameError = validateSafeText(
    "Company name",
    values.companyName,
    120,
    true,
  );

  if (companyNameError) errors.companyName = companyNameError;

  const businessTypeError = validateSafeText(
    "Business type",
    values.businessType,
    80,
  );

  if (businessTypeError) errors.businessType = businessTypeError;

  const contactPersonError = validateSafeText(
    "Contact person",
    values.contactPerson,
    80,
  );

  if (contactPersonError) errors.contactPerson = contactPersonError;

  const locationError = validateSafeText("Location", values.location, 120);

  if (locationError) errors.location = locationError;

  if (values.phone && !isValidPhone(values.phone)) {
    errors.phone = "Phone can only contain numbers, spaces, +, -, and brackets";
  }

  if (values.email && !isValidEmail(values.email)) {
    errors.email = "Enter a valid email address";
  }

  if (values.website && !isValidWebsite(values.website)) {
    errors.website = "Enter a valid website URL";
  }

  if (!CLIENT_STATUSES.includes(values.status)) {
    errors.status = "Invalid client status";
  }

  if (values.description.length > 1000) {
    errors.description = "Description must be 1000 characters or less";
  }

  if (
    values.description &&
    (hasUnsafeCharacters(values.description) ||
      hasUnsafePattern(values.description))
  ) {
    errors.description = "Description contains invalid characters";
  }

  if (values.notes.length > 1000) {
    errors.notes = "Notes must be 1000 characters or less";
  }

  if (
    values.notes &&
    (hasUnsafeCharacters(values.notes) || hasUnsafePattern(values.notes))
  ) {
    errors.notes = "Notes contain invalid characters";
  }

  return { values, errors };
}

function getStatusChipSx(status: ClientStatus): SxProps<Theme> {
  const statusColors: Record<ClientStatus, string> = {
    "New Lead": "#64748B",
    Contacted: "#0EA5E9",
    Interested: "#F59E0B",
    "Not Interested": "#EF4444",
    Converted: "#10B981",
  };

  const color = statusColors[status];

  return {
    height: 26,
    borderRadius: "999px",
    fontWeight: 700,
    fontSize: 12,
    color,
    bgcolor: alpha(color, 0.12),
    border: `1px solid ${alpha(color, 0.25)}`,
  };
}

function getClientInitial(companyName: string) {
  return companyName.trim().charAt(0).toUpperCase() || "C";
}

function formatDate(date?: string) {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getCreatedAtTime(createdAt?: string) {
  if (!createdAt) return 0;

  const time = new Date(createdAt).getTime();

  return Number.isNaN(time) ? 0 : time;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState<ClientFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<ClientFormErrors>({});
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const [actionClient, setActionClient] = useState<Client | null>(null);

  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalClients, setTotalClients] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sortedClients = useMemo(() => {
    return [...clients].sort(
      (firstClient, secondClient) =>
        getCreatedAtTime(secondClient.createdAt) -
        getCreatedAtTime(firstClient.createdAt),
    );
  }, [clients]);

  async function fetchClients(pageNumber = page, search = searchQuery) {
    setLoading(true);
    setError("");

    const queryParams = new URLSearchParams({
      page: String(pageNumber),
      limit: String(CLIENTS_PER_PAGE),
    });

    const cleanSearch = search.trim();

    if (cleanSearch) {
      queryParams.set("search", cleanSearch);
    }

    try {
      const response = await apiFetch<ClientsResponse>(
        `/api/clients?${queryParams.toString()}`,
      );

      const pagination = getPaginationFromResponse(response);

      setClients(getClientsFromResponse(response));
      setTotalClients(pagination.total);
      setTotalPages(Math.max(pagination.totalPages, 1));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load clients";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchClients(page, searchQuery);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [page, searchQuery]);

  function handleCreateOpen() {
    setEditingClient(null);
    setFormData(emptyForm);
    setFormErrors({});
    setOpenForm(true);
    setError("");
    setSuccess("");
  }

  function handleEditOpen(client: Client) {
    setEditingClient(client);
    setFormData({
      companyName: client.companyName || "",
      businessType: client.businessType || "",
      contactPerson: client.contactPerson || "",
      phone: client.phone || "",
      email: client.email || "",
      location: client.location || "",
      website: client.website || "",
      description: client.description || "",
      notes: client.notes || "",
      status: client.status || "New Lead",
    });
    setFormErrors({});
    setOpenForm(true);
    setError("");
    setSuccess("");
  }

  function handleFormClose() {
    if (saving) return;

    setOpenForm(false);
    setEditingClient(null);
    setFormData(emptyForm);
    setFormErrors({});
  }

  function updateFormField<K extends keyof ClientFormData>(
    field: K,
    value: ClientFormData[K],
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    setFormErrors((current) => ({
      ...current,
      [field]: "",
    }));
  }

  function handleActionMenuOpen(
    event: React.MouseEvent<HTMLElement>,
    client: Client,
  ) {
    setActionAnchorEl(event.currentTarget);
    setActionClient(client);
  }

  function handleActionMenuClose() {
    setActionAnchorEl(null);
    setActionClient(null);
  }

  function handleMenuEdit() {
    if (!actionClient) return;

    const selectedClient = actionClient;
    handleActionMenuClose();
    handleEditOpen(selectedClient);
  }

  function handleMenuDelete() {
    if (!actionClient) return;

    const selectedClient = actionClient;
    handleActionMenuClose();
    setDeleteClient(selectedClient);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const { values, errors } = validateClientForm(formData);

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setError("Please fix the highlighted fields");
      return;
    }

    setFormData(values);
    setFormErrors({});
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingClient) {
        await apiFetch(`/api/clients/${editingClient._id}`, {
          method: "PUT",
          body: JSON.stringify(values),
        });

        setSuccess("Client updated successfully");
      } else {
        await apiFetch("/api/clients", {
          method: "POST",
          body: JSON.stringify(values),
        });

        setSuccess("Client created successfully");
      }

      handleFormClose();
      setPage(1);
      await fetchClients(1, searchQuery);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save client";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteClient) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch(`/api/clients/${deleteClient._id}`, {
        method: "DELETE",
      });

      setSuccess("Client deleted successfully");
      setDeleteClient(null);
      await fetchClients(page, searchQuery);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete client";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          mb: 3,
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              letterSpacing: "-0.04em",
            }}
          >
            Clients
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Manage companies, leads, and customer information.
          </Typography>
        </Box>

        <Button
          variant="contained"
          onClick={handleCreateOpen}
          sx={{
            px: 2.5,
            height: 44,
            borderRadius: 2,
            fontWeight: 700,
            alignSelf: { xs: "stretch", sm: "center" },
          }}
        >
          Add Client
        </Button>
      </Stack>

      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <TextField
          size="small"
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Search by company, contact, email, phone, or location..."
          sx={{
            width: { xs: "100%", sm: 520, md: 620 },
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              bgcolor: "background.paper",
            },
          }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess("")}
        >
          {success}
        </Alert>
      )}

      <Card
        sx={{
          borderRadius: 4,
          overflow: "hidden",
          border: (theme) => `1px solid ${theme.palette.divider}`,
          bgcolor: "background.paper",
        }}
      >
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : clients.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8, px: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                No clients yet
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Add your first client to start building the CRM.
              </Typography>

              <Button
                variant="contained"
                onClick={handleCreateOpen}
                sx={{ mt: 3, borderRadius: 2, fontWeight: 700 }}
              >
                Add Client
              </Button>
            </Box>
          ) : (
            <>
              <TableContainer
                sx={{
                  width: "100%",
                  maxWidth: "100%",
                  overflowX: "hidden",
                }}
              >
                <Table
                  sx={{
                    width: "100%",
                    tableLayout: "fixed",
                  }}
                >
                  <TableHead>
                    <TableRow
                      sx={{
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark"
                            ? alpha(theme.palette.primary.main, 0.08)
                            : alpha(theme.palette.primary.main, 0.04),
                      }}
                    >
                      <TableCell
                        align="center"
                        sx={{
                          ...tableHeaderCellSx,
                          width: 56,
                        }}
                      >
                        #
                      </TableCell>

                      <TableCell
                        align="left"
                        sx={{
                          ...tableHeaderCellSx,
                          width: { xs: "72%", sm: "54%", md: "34%", lg: "30%" },
                        }}
                      >
                        Company
                      </TableCell>

                      <TableCell
                        sx={{
                          ...tableHeaderCellSx,
                          ...hideFromMobileSx,
                          width: { md: "18%", lg: "16%" },
                        }}
                      >
                        Contact
                      </TableCell>

                      <TableCell
                        sx={{
                          ...tableHeaderCellSx,
                          ...hideUntilWideSx,
                          width: { xl: "20%" },
                        }}
                      >
                        Email
                      </TableCell>

                      <TableCell
                        sx={{
                          ...tableHeaderCellSx,
                          ...hideUntilWideSx,
                          width: { xl: "14%" },
                        }}
                      >
                        Phone
                      </TableCell>

                      <TableCell
                        sx={{
                          ...tableHeaderCellSx,
                          ...hideFromTabletSx,
                          width: { lg: "14%" },
                        }}
                      >
                        Created Date
                      </TableCell>

                      <TableCell
                        sx={{
                          ...tableHeaderCellSx,
                          ...hideOnPhoneSx,
                          width: { sm: "24%", md: "16%", lg: "14%" },
                        }}
                      >
                        Status
                      </TableCell>

                      <TableCell
                        align="center"
                        sx={{
                          ...tableHeaderCellSx,
                          width: { xs: "28%", sm: "22%", md: 120 },
                        }}
                      >
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {sortedClients.map((client, index) => (
                      <TableRow
                        key={client._id}
                        hover
                        sx={{
                          "&:last-child td": {
                            borderBottom: 0,
                          },
                        }}
                      >
                        <TableCell
                          align="center"
                          sx={{
                            ...tableBodyCellSx,
                            width: 56,
                            fontWeight: 800,
                            color: "text.secondary",
                          }}
                        >
                          {(page - 1) * CLIENTS_PER_PAGE + index + 1}
                        </TableCell>

                        <TableCell
                          sx={{
                            ...tableBodyCellSx,
                            width: { xs: "72%", sm: "54%", md: "34%", lg: "30%" },
                            minWidth: 0,
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={{ xs: 0.75, md: 1.5 }}
                            sx={{ alignItems: "center", minWidth: 0 }}
                          >
                            <Box
                              sx={{
                                width: { xs: 32, md: 40 },
                                height: { xs: 32, md: 40 },
                                borderRadius: 2.5,
                                display: "grid",
                                placeItems: "center",
                                flexShrink: 0,
                                fontWeight: 800,
                                fontSize: { xs: 12, md: 14 },
                                color: "primary.main",
                                bgcolor: (theme) =>
                                  alpha(theme.palette.primary.main, 0.12),
                                border: (theme) =>
                                  `1px solid ${alpha(
                                    theme.palette.primary.main,
                                    0.18,
                                  )}`,
                              }}
                            >
                              {getClientInitial(client.companyName)}
                            </Box>

                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                sx={{
                                  fontWeight: 800,
                                  fontSize: { xs: 13, md: 14 },
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {client.companyName}
                              </Typography>

                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  mt: 0.25,
                                  display: { xs: "none", sm: "block" },
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {client.businessType || "No business type"}
                              </Typography>

                              <Chip
                                label={client.status}
                                size="small"
                                sx={{
                                  ...getStatusChipSx(client.status),
                                  display: { xs: "inline-flex", sm: "none" },
                                  mt: 0.75,
                                  maxWidth: "100%",
                                  "& .MuiChip-label": {
                                    px: 0.75,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  },
                                }}
                              />
                            </Box>
                          </Stack>
                        </TableCell>

                        <TableCell
                          sx={{
                            ...tableBodyCellSx,
                            ...hideFromMobileSx,
                          }}
                        >
                          <Typography
                            sx={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {client.contactPerson || "-"}
                          </Typography>
                        </TableCell>

                        <TableCell
                          sx={{
                            ...tableBodyCellSx,
                            ...hideUntilWideSx,
                          }}
                        >
                          <Typography
                            sx={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {client.email || "-"}
                          </Typography>
                        </TableCell>

                        <TableCell
                          sx={{
                            ...tableBodyCellSx,
                            ...hideUntilWideSx,
                          }}
                        >
                          <Typography
                            sx={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {client.phone || "-"}
                          </Typography>
                        </TableCell>

                        <TableCell
                          sx={{
                            ...tableBodyCellSx,
                            ...hideFromTabletSx,
                            fontWeight: 700,
                          }}
                        >
                          {formatDate(client.createdAt)}
                        </TableCell>

                        <TableCell
                          sx={{
                            ...tableBodyCellSx,
                            ...hideOnPhoneSx,
                          }}
                        >
                          <Chip
                            label={client.status}
                            size="small"
                            sx={getStatusChipSx(client.status)}
                          />
                        </TableCell>

                        <TableCell
                          align="right"
                          sx={{
                            ...tableBodyCellSx,
                            width: { xs: "28%", sm: "22%", md: 120 },
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={{ xs: 0.5, md: 1 }}
                            sx={{
                              justifyContent: "flex-end",
                              alignItems: "center",
                              flexWrap: "nowrap",
                            }}
                          >
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setViewClient(client)}
                              sx={{
                                borderRadius: 2,
                                fontWeight: 700,
                                minWidth: { xs: 44, md: 64 },
                                height: { xs: 30, md: 34 },
                                px: { xs: 0.75, md: 1.5 },
                                fontSize: { xs: 11, md: 13 },
                              }}
                            >
                              View
                            </Button>

                            <IconButton
                              size="small"
                              onClick={(event) =>
                                handleActionMenuOpen(event, client)
                              }
                              aria-label={`Open actions for ${client.companyName}`}
                              sx={{
                                display: { xs: "none", md: "inline-flex" },
                                width: 34,
                                height: 34,
                                borderRadius: 2,
                                border: (theme) =>
                                  `1px solid ${theme.palette.divider}`,
                                fontWeight: 900,
                                fontSize: 18,
                                lineHeight: 1,
                              }}
                            >
                              ⋮
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box
                sx={{
                  px: 2,
                  py: 2,
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                  borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Showing page {page} of {totalPages} · {totalClients} clients
                </Typography>

                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                  shape="rounded"
                />
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      <Menu
        anchorEl={actionAnchorEl}
        open={Boolean(actionAnchorEl)}
        onClose={handleActionMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={handleMenuEdit}>
          <Box component="span" sx={{ mr: 1.25, fontWeight: 900 }}>
            ✎
          </Box>
          Edit
        </MenuItem>

        <MenuItem onClick={handleMenuDelete} sx={{ color: "error.main" }}>
          <Box component="span" sx={{ mr: 1.25, fontWeight: 900 }}>
            ×
          </Box>
          Delete
        </MenuItem>
      </Menu>

      <Dialog
        open={Boolean(viewClient)}
        onClose={() => setViewClient(null)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              bgcolor: "background.paper",
              backgroundImage: "none",
              border: (theme) => `1px solid ${theme.palette.divider}`,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          Client Details
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Company Name"
              fullWidth
              value={viewClient?.companyName || "-"}
              sx={readonlyTextFieldSx}
              slotProps={{ input: { readOnly: true } }}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Business Type"
                fullWidth
                value={viewClient?.businessType || "-"}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="Status"
                fullWidth
                value={viewClient?.status || "-"}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Contact Person"
                fullWidth
                value={viewClient?.contactPerson || "-"}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="Phone"
                fullWidth
                value={viewClient?.phone || "-"}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Email"
                fullWidth
                value={viewClient?.email || "-"}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="Website"
                fullWidth
                value={viewClient?.website || "-"}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />
            </Stack>

            <TextField
              label="Location"
              fullWidth
              value={viewClient?.location || "-"}
              sx={readonlyTextFieldSx}
              slotProps={{ input: { readOnly: true } }}
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={3}
              value={viewClient?.description || "-"}
              sx={readonlyMultilineTextFieldSx}
              slotProps={{ input: { readOnly: true } }}
            />

            <TextField
              label="Notes"
              fullWidth
              multiline
              minRows={3}
              value={viewClient?.notes || "-"}
              sx={readonlyMultilineTextFieldSx}
              slotProps={{ input: { readOnly: true } }}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Created At"
                fullWidth
                value={formatDate(viewClient?.createdAt)}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="Updated At"
                fullWidth
                value={formatDate(viewClient?.updatedAt)}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="contained" onClick={() => setViewClient(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openForm}
        onClose={handleFormClose}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              bgcolor: "background.paper",
              backgroundImage: "none",
              border: (theme) => `1px solid ${theme.palette.divider}`,
            },
          },
        }}
      >
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
            {editingClient ? "Edit Client" : "Add Client"}
          </DialogTitle>

          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Company Name"
                required
                fullWidth
                value={formData.companyName}
                onChange={(event) =>
                  updateFormField("companyName", event.target.value)
                }
                error={Boolean(formErrors.companyName)}
                helperText={formErrors.companyName}
              />

              <TextField
                label="Business Type"
                fullWidth
                value={formData.businessType}
                onChange={(event) =>
                  updateFormField("businessType", event.target.value)
                }
                error={Boolean(formErrors.businessType)}
                helperText={formErrors.businessType}
              />

              <TextField
                label="Contact Person"
                fullWidth
                value={formData.contactPerson}
                onChange={(event) =>
                  updateFormField("contactPerson", event.target.value)
                }
                error={Boolean(formErrors.contactPerson)}
                helperText={formErrors.contactPerson}
              />

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Phone"
                  fullWidth
                  value={formData.phone}
                  onChange={(event) =>
                    updateFormField("phone", event.target.value)
                  }
                  error={Boolean(formErrors.phone)}
                  helperText={formErrors.phone}
                />

                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  value={formData.email}
                  onChange={(event) =>
                    updateFormField("email", event.target.value)
                  }
                  error={Boolean(formErrors.email)}
                  helperText={formErrors.email}
                />
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Location"
                  fullWidth
                  value={formData.location}
                  onChange={(event) =>
                    updateFormField("location", event.target.value)
                  }
                  error={Boolean(formErrors.location)}
                  helperText={formErrors.location}
                />

                <TextField
                  label="Website"
                  fullWidth
                  value={formData.website}
                  onChange={(event) =>
                    updateFormField("website", event.target.value)
                  }
                  error={Boolean(formErrors.website)}
                  helperText={formErrors.website || "Example: example.com"}
                />
              </Stack>

              <TextField
                select
                label="Status"
                fullWidth
                value={formData.status}
                onChange={(event) =>
                  updateFormField("status", event.target.value as ClientStatus)
                }
                error={Boolean(formErrors.status)}
                helperText={formErrors.status}
              >
                {CLIENT_STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Description"
                fullWidth
                multiline
                minRows={3}
                value={formData.description}
                onChange={(event) =>
                  updateFormField("description", event.target.value)
                }
                error={Boolean(formErrors.description)}
                helperText={formErrors.description}
              />

              <TextField
                label="Notes"
                fullWidth
                multiline
                minRows={3}
                value={formData.notes}
                onChange={(event) =>
                  updateFormField("notes", event.target.value)
                }
                error={Boolean(formErrors.notes)}
                helperText={formErrors.notes}
              />
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleFormClose} disabled={saving}>
              Cancel
            </Button>

            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "Saving..." : editingClient ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={Boolean(deleteClient)}
        onClose={() => {
          if (!saving) setDeleteClient(null);
        }}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              bgcolor: "background.paper",
              backgroundImage: "none",
              border: (theme) => `1px solid ${theme.palette.divider}`,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Delete Client</DialogTitle>

        <DialogContent>
          <Typography color="text.secondary">
            Are you sure you want to delete{" "}
            <Box
              component="span"
              sx={{ color: "text.primary", fontWeight: 800 }}
            >
              {deleteClient?.companyName}
            </Box>
            ?
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteClient(null)} disabled={saving}>
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteConfirm}
            disabled={saving}
          >
            {saving ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
