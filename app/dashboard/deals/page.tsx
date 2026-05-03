"use client";

import { useEffect, useMemo, useState } from "react";
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

type DealStatus =
  | "Lead"
  | "Contacted"
  | "Proposal Sent"
  | "Negotiation"
  | "Closed Won"
  | "Closed Lost";

type Client = {
  _id: string;
  companyName: string;
  contactPerson?: string;
  email?: string;
};

type DealClient = Client | string;

type Deal = {
  _id: string;
  clientId: DealClient;
  title: string;
  estimatedBudget: number;
  finalPrice?: number;
  status: DealStatus;
  probability?: number;
  expectedCloseDate?: string;
  description?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ProjectDeal = string | { _id: string };

type Project = {
  _id: string;
  name?: string;
  dealId?: ProjectDeal;
};

type DealFormData = {
  clientId: string;
  title: string;
  estimatedBudget: string;
  finalPrice: string;
  status: DealStatus;
  probability: string;
  expectedCloseDate: string;
  description: string;
  notes: string;
};

type DealFormErrors = Partial<Record<keyof DealFormData, string>>;

type DealPayload = {
  clientId: string;
  title: string;
  estimatedBudget: number;
  finalPrice: number;
  status: DealStatus;
  probability: number;
  expectedCloseDate?: string;
  description: string;
  notes: string;
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

type ClientsResponse = {
  success?: boolean;
  message?: string;
  data?:
    | Client[]
    | {
        clients?: Client[];
        items?: Client[];
        records?: Client[];
      };
  clients?: Client[];
  items?: Client[];
  records?: Client[];
};

type ProjectsResponse = {
  success?: boolean;
  message?: string;
  data?:
    | Project[]
    | {
        projects?: Project[];
        items?: Project[];
        records?: Project[];
      };
  projects?: Project[];
  items?: Project[];
  records?: Project[];
};

const DEAL_STATUSES: DealStatus[] = [
  "Lead",
  "Contacted",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];

const emptyForm: DealFormData = {
  clientId: "",
  title: "",
  estimatedBudget: "",
  finalPrice: "",
  status: "Lead",
  probability: "0",
  expectedCloseDate: "",
  description: "",
  notes: "",
};

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

function getClientsFromResponse(response: ClientsResponse): Client[] {
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.clients)) return response.clients;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.records)) return response.records;

  if (response.data && !Array.isArray(response.data)) {
    if (Array.isArray(response.data.clients)) return response.data.clients;
    if (Array.isArray(response.data.items)) return response.data.items;
    if (Array.isArray(response.data.records)) return response.data.records;
  }

  return [];
}

function getProjectsFromResponse(response: ProjectsResponse): Project[] {
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.projects)) return response.projects;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.records)) return response.records;

  if (response.data && !Array.isArray(response.data)) {
    if (Array.isArray(response.data.projects)) return response.data.projects;
    if (Array.isArray(response.data.items)) return response.data.items;
    if (Array.isArray(response.data.records)) return response.data.records;
  }

  return [];
}

function getClientName(clientId: DealClient) {
  if (typeof clientId === "object" && clientId?.companyName) {
    return clientId.companyName;
  }

  return "-";
}

function getDateInputValue(date?: string) {
  if (!date) return "";
  return date.slice(0, 10);
}

function getTodayInputValue() {
  const today = new Date();
  const timezoneOffset = today.getTimezoneOffset() * 60000;
  return new Date(today.getTime() - timezoneOffset).toISOString().slice(0, 10);
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

function getExpectedCloseDateTime(expectedCloseDate?: string) {
  if (!expectedCloseDate) return Number.POSITIVE_INFINITY;

  const time = new Date(expectedCloseDate).getTime();

  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function getCreatedAtTime(createdAt?: string) {
  if (!createdAt) return 0;

  const time = new Date(createdAt).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function getProjectDealId(project: Project) {
  if (!project.dealId) return "";

  if (typeof project.dealId === "object") {
    return project.dealId._id;
  }

  return project.dealId;
}

function cleanSingleLineText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function cleanMultiLineText(value: string) {
  return value.trim().replace(/[ \t]+/g, " ");
}

function hasUnsafeCharacters(value: string) {
  return /[<>{}\[\]`$|\\]/.test(value);
}

function hasUnsafePattern(value: string) {
  return /(javascript:|data:|on\w+\s*=|<\s*script)/i.test(value);
}

function isValidMoneyValue(value: string) {
  return /^\d+(\.\d{1,2})?$/.test(value.trim());
}

function isValidProbabilityValue(value: string) {
  return /^\d+(\.\d{1,2})?$/.test(value.trim());
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

function validateLongText(label: string, value: string, maxLength: number) {
  const cleanValue = cleanMultiLineText(value);

  if (cleanValue.length > maxLength) {
    return `${label} must be ${maxLength} characters or less`;
  }

  if (
    cleanValue &&
    (hasUnsafeCharacters(cleanValue) || hasUnsafePattern(cleanValue))
  ) {
    return `${label} contains invalid characters`;
  }

  return "";
}

function validateDealForm(data: DealFormData) {
  const today = getTodayInputValue();

  const values: DealFormData = {
    clientId: data.clientId,
    title: cleanSingleLineText(data.title),
    estimatedBudget: data.estimatedBudget.trim(),
    finalPrice: data.finalPrice.trim(),
    status: data.status,
    probability: data.probability.trim() || "0",
    expectedCloseDate: data.expectedCloseDate,
    description: cleanMultiLineText(data.description),
    notes: cleanMultiLineText(data.notes),
  };

  const errors: DealFormErrors = {};

  if (!values.clientId) {
    errors.clientId = "Client is required";
  }

  const titleError = validateSafeText("Deal title", values.title, 120, true);

  if (titleError) {
    errors.title = titleError;
  }

  if (!values.estimatedBudget) {
    errors.estimatedBudget = "Estimated budget is required";
  } else if (!isValidMoneyValue(values.estimatedBudget)) {
    errors.estimatedBudget =
      "Estimated budget must be a valid number with up to 2 decimals";
  } else if (Number(values.estimatedBudget) <= 0) {
    errors.estimatedBudget = "Estimated budget must be greater than 0";
  }

  if (values.finalPrice) {
    if (!isValidMoneyValue(values.finalPrice)) {
      errors.finalPrice =
        "Final price must be a valid number with up to 2 decimals";
    } else if (Number(values.finalPrice) < 0) {
      errors.finalPrice = "Final price cannot be negative";
    }
  }

  if (!DEAL_STATUSES.includes(values.status)) {
    errors.status = "Invalid deal status";
  }

  if (!isValidProbabilityValue(values.probability)) {
    errors.probability = "Probability must be a valid number";
  } else {
    const probabilityNumber = Number(values.probability);

    if (probabilityNumber < 0 || probabilityNumber > 100) {
      errors.probability = "Probability must be between 0 and 100";
    }
  }

  if (values.expectedCloseDate && values.expectedCloseDate < today) {
    errors.expectedCloseDate = "Expected close date cannot be in the past";
  }

  const descriptionError = validateLongText(
    "Description",
    values.description,
    1000,
  );

  if (descriptionError) {
    errors.description = descriptionError;
  }

  const notesError = validateLongText("Notes", values.notes, 1000);

  if (notesError) {
    errors.notes = notesError;
  }

  const payload: DealPayload = {
    clientId: values.clientId,
    title: values.title,
    estimatedBudget: Number(values.estimatedBudget),
    finalPrice: values.finalPrice ? Number(values.finalPrice) : 0,
    status: values.status,
    probability: Number(values.probability || 0),
    expectedCloseDate: values.expectedCloseDate || undefined,
    description: values.description,
    notes: values.notes,
  };

  return { values, payload, errors };
}

function getStatusChipSx(status: DealStatus): SxProps<Theme> {
  const statusColors: Record<DealStatus, string> = {
    Lead: "#64748B",
    Contacted: "#0EA5E9",
    "Proposal Sent": "#6366F1",
    Negotiation: "#F59E0B",
    "Closed Won": "#10B981",
    "Closed Lost": "#EF4444",
  };

  const color = statusColors[status];

  return {
    height: 26,
    borderRadius: "999px",
    fontWeight: 800,
    fontSize: 12,
    color,
    bgcolor: alpha(color, 0.12),
    border: `1px solid ${alpha(color, 0.25)}`,
  };
}

function getDealInitial(title: string) {
  return title.trim().charAt(0).toUpperCase() || "D";
}

function formatBHD(value?: number) {
  return `${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} BHD`;
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [formData, setFormData] = useState<DealFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<DealFormErrors>({});
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [deleteDeal, setDeleteDeal] = useState<Deal | null>(null);
  const [viewDeal, setViewDeal] = useState<Deal | null>(null);
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const [actionDeal, setActionDeal] = useState<Deal | null>(null);

  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sortedDeals = useMemo(() => {
    return [...deals].sort((firstDeal, secondDeal) => {
      const closeDateDifference =
        getExpectedCloseDateTime(firstDeal.expectedCloseDate) -
        getExpectedCloseDateTime(secondDeal.expectedCloseDate);

      if (closeDateDifference !== 0) {
        return closeDateDifference;
      }

      return (
        getCreatedAtTime(secondDeal.createdAt) -
        getCreatedAtTime(firstDeal.createdAt)
      );
    });
  }, [deals]);

  const convertedDealIds = useMemo(() => {
    return new Set(
      projects
        .map((project) => getProjectDealId(project))
        .filter((dealId) => Boolean(dealId)),
    );
  }, [projects]);

  async function fetchData() {
    setLoading(true);
    setError("");

    try {
      const [dealsResponse, clientsResponse, projectsResponse] =
        await Promise.all([
          apiFetch<DealsResponse>("/api/deals"),
          apiFetch<ClientsResponse>("/api/clients"),
          apiFetch<ProjectsResponse>("/api/projects"),
        ]);

      setDeals(getDealsFromResponse(dealsResponse));
      setClients(getClientsFromResponse(clientsResponse));
      setProjects(getProjectsFromResponse(projectsResponse));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load deals";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function handleCreateOpen() {
    setEditingDeal(null);
    setFormData(emptyForm);
    setFormErrors({});
    setOpenForm(true);
    setError("");
    setSuccess("");
  }

  function handleEditOpen(deal: Deal) {
    const clientId =
      typeof deal.clientId === "object" ? deal.clientId._id : deal.clientId;

    setEditingDeal(deal);
    setFormData({
      clientId: clientId || "",
      title: deal.title || "",
      estimatedBudget:
        deal.estimatedBudget !== undefined && deal.estimatedBudget !== null
          ? String(deal.estimatedBudget)
          : "",
      finalPrice:
        deal.finalPrice !== undefined && deal.finalPrice !== null
          ? String(deal.finalPrice)
          : "",
      status: deal.status || "Lead",
      probability:
        deal.probability !== undefined && deal.probability !== null
          ? String(deal.probability)
          : "0",
      expectedCloseDate: getDateInputValue(deal.expectedCloseDate),
      description: deal.description || "",
      notes: deal.notes || "",
    });
    setFormErrors({});
    setOpenForm(true);
    setError("");
    setSuccess("");
  }

  function handleFormClose() {
    if (saving) return;

    setOpenForm(false);
    setEditingDeal(null);
    setFormData(emptyForm);
    setFormErrors({});
  }

  function updateFormField<K extends keyof DealFormData>(
    field: K,
    value: DealFormData[K],
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
    deal: Deal,
  ) {
    setActionAnchorEl(event.currentTarget);
    setActionDeal(deal);
  }

  function handleActionMenuClose() {
    setActionAnchorEl(null);
    setActionDeal(null);
  }

  function handleMenuEdit() {
    if (!actionDeal) return;

    const selectedDeal = actionDeal;
    handleActionMenuClose();
    handleEditOpen(selectedDeal);
  }

  function handleMenuDelete() {
    if (!actionDeal) return;

    const selectedDeal = actionDeal;
    handleActionMenuClose();
    setDeleteDeal(selectedDeal);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const { values, payload, errors } = validateDealForm(formData);

    if (Object.keys(errors).length > 0) {
      setFormData(values);
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
      if (editingDeal) {
        await apiFetch(`/api/deals/${editingDeal._id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setSuccess("Deal updated successfully");
      } else {
        await apiFetch("/api/deals", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setSuccess("Deal created successfully");
      }

      handleFormClose();
      await fetchData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save deal";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteDeal) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch(`/api/deals/${deleteDeal._id}`, {
        method: "DELETE",
      });

      setSuccess("Deal deleted successfully");
      setDeleteDeal(null);
      await fetchData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete deal";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleConvertToProject(deal: Deal) {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch(`/api/deals/${deal._id}/convert-to-project`, {
        method: "POST",
      });

      setSuccess("Deal converted to project successfully");
      await fetchData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to convert deal";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2,
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
            Deals
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Track sales opportunities before they become projects.
          </Typography>
        </Box>

        <Button
          variant="contained"
          onClick={handleCreateOpen}
          sx={{
            px: 2.5,
            height: 44,
            borderRadius: 2,
            fontWeight: 800,
            alignSelf: { xs: "stretch", sm: "center" },
          }}
        >
          Add Deal
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
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
          ) : deals.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8, px: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                No deals yet
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Add your first deal to start tracking your sales pipeline.
              </Typography>

              <Button
                variant="contained"
                onClick={handleCreateOpen}
                sx={{ mt: 3, borderRadius: 2, fontWeight: 800 }}
              >
                Add Deal
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow
                    sx={{
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark"
                          ? alpha(theme.palette.primary.main, 0.08)
                          : alpha(theme.palette.primary.main, 0.04),
                    }}
                  >
                    <TableCell align="center">Deal</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Expected Close</TableCell>
                    <TableCell>Budget</TableCell>
                    <TableCell>Final Price</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Probability</TableCell>
                    <TableCell
                      align="center"
                      sx={{ width: 290, whiteSpace: "nowrap", pr: 2 }}
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {sortedDeals.map((deal) => {
                    const isConverted = convertedDealIds.has(deal._id);

                    return (
                      <TableRow
                        key={deal._id}
                        hover
                        sx={{
                          "&:last-child td": {
                            borderBottom: 0,
                          },
                        }}
                      >
                        <TableCell sx={{ minWidth: 260 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                            }}
                          >
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2.5,
                                display: "grid",
                                placeItems: "center",
                                fontWeight: 900,
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
                              {getDealInitial(deal.title)}
                            </Box>

                            <Box>
                              <Typography sx={{ fontWeight: 800 }}>
                                {deal.title}
                              </Typography>

                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  mt: 0.25,
                                  maxWidth: 280,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {deal.description || "No description"}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        <TableCell>{getClientName(deal.clientId)}</TableCell>

                        <TableCell sx={{ minWidth: 140, fontWeight: 700 }}>
                          {formatDate(deal.expectedCloseDate)}
                        </TableCell>

                        

                        <TableCell sx={{ fontWeight: 700 }}>
                          {formatBHD(deal.estimatedBudget)}
                        </TableCell>

                        <TableCell sx={{ fontWeight: 700 }}>
                          {formatBHD(deal.finalPrice)}
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={deal.status}
                            size="small"
                            sx={getStatusChipSx(deal.status)}
                          />
                        </TableCell>

                        <TableCell>
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography sx={{ fontWeight: 800 }}>
                              {deal.probability || 0}%
                            </Typography>

                            <Box
                              sx={{
                                width: 54,
                                height: 6,
                                borderRadius: 999,
                                bgcolor: (theme) =>
                                  alpha(theme.palette.text.primary, 0.1),
                                overflow: "hidden",
                              }}
                            >
                              <Box
                                sx={{
                                  width: `${Math.min(
                                    Math.max(deal.probability || 0, 0),
                                    100,
                                  )}%`,
                                  height: "100%",
                                  borderRadius: 999,
                                  bgcolor: (theme) =>
                                    deal.status === "Closed Won"
                                      ? theme.palette.success.main
                                      : deal.status === "Closed Lost"
                                        ? theme.palette.error.main
                                        : theme.palette.primary.main,
                                }}
                              />
                            </Box>
                          </Box>
                        </TableCell>

                        <TableCell
                          align="right"
                          sx={{ width: 180, whiteSpace: "nowrap", pr: 2 }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "flex-end",
                              alignItems: "center",
                              gap: 0.5,
                              flexWrap: "wrap",
                            }}
                          >
                            {deal.status === "Closed Won" && !isConverted && (
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleConvertToProject(deal)}
                                disabled={saving}
                                sx={{
                                  borderRadius: 2,
                                  fontWeight: 800,
                                }}
                              >
                                Convert
                              </Button>
                            )}

                            {deal.status === "Closed Won" && isConverted && (
                              <Button
                                size="small"
                                variant="outlined"
                                disabled
                                sx={{
                                  borderRadius: 2,
                                  fontWeight: 800,
                                }}
                              >
                                Converted
                              </Button>
                            )}

                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setViewDeal(deal)}
                              sx={{
                                borderRadius: 2,
                                fontWeight: 800,
                              }}
                            >
                              View
                            </Button>

                            <IconButton
                              size="small"
                              onClick={(event) =>
                                handleActionMenuOpen(event, deal)
                              }
                              aria-label={`Open actions for ${deal.title}`}
                              sx={{
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
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
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
        open={Boolean(viewDeal)}
        onClose={() => setViewDeal(null)}
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
        <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>Deal Details</DialogTitle>

        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                label="Deal Title"
                fullWidth
                value={viewDeal?.title || "-"}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="Client"
                fullWidth
                value={viewDeal ? getClientName(viewDeal.clientId) : "-"}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                label="Estimated Budget"
                fullWidth
                value={formatBHD(viewDeal?.estimatedBudget)}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="Final Price"
                fullWidth
                value={formatBHD(viewDeal?.finalPrice)}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="Probability"
                fullWidth
                value={`${viewDeal?.probability || 0}%`}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                label="Status"
                fullWidth
                value={viewDeal?.status || "-"}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="Expected Close Date"
                fullWidth
                value={formatDate(viewDeal?.expectedCloseDate)}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="Created At"
                fullWidth
                value={formatDate(viewDeal?.createdAt)}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />
            </Box>

            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={3}
              value={viewDeal?.description || "-"}
              sx={readonlyMultilineTextFieldSx}
              slotProps={{ input: { readOnly: true } }}
            />

            <TextField
              label="Notes"
              fullWidth
              multiline
              minRows={3}
              value={viewDeal?.notes || "-"}
              sx={readonlyMultilineTextFieldSx}
              slotProps={{ input: { readOnly: true } }}
            />

            <TextField
              label="Updated At"
              fullWidth
              value={formatDate(viewDeal?.updatedAt)}
              sx={readonlyTextFieldSx}
              slotProps={{ input: { readOnly: true } }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="contained" onClick={() => setViewDeal(null)}>
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
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>
            {editingDeal ? "Edit Deal" : "Add Deal"}
          </DialogTitle>

          <DialogContent>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                mt: 1,
              }}
            >
              <TextField
                select
                label="Client"
                required
                fullWidth
                value={formData.clientId}
                onChange={(event) =>
                  updateFormField("clientId", event.target.value)
                }
                error={Boolean(formErrors.clientId)}
                helperText={formErrors.clientId}
              >
                {clients.map((client) => (
                  <MenuItem key={client._id} value={client._id}>
                    {client.companyName}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Deal Title"
                required
                fullWidth
                value={formData.title}
                onChange={(event) =>
                  updateFormField("title", event.target.value)
                }
                error={Boolean(formErrors.title)}
                helperText={formErrors.title}
              />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 2,
                }}
              >
                <TextField
                  label="Estimated Budget"
                  type="number"
                  required
                  fullWidth
                  value={formData.estimatedBudget}
                  onChange={(event) =>
                    updateFormField("estimatedBudget", event.target.value)
                  }
                  error={Boolean(formErrors.estimatedBudget)}
                  helperText={formErrors.estimatedBudget}
                  slotProps={{
                    htmlInput: {
                      min: "0",
                      step: "0.01",
                    },
                  }}
                />

                <TextField
                  label="Final Price"
                  type="number"
                  fullWidth
                  value={formData.finalPrice}
                  onChange={(event) =>
                    updateFormField("finalPrice", event.target.value)
                  }
                  error={Boolean(formErrors.finalPrice)}
                  helperText={formErrors.finalPrice}
                  slotProps={{
                    htmlInput: {
                      min: "0",
                      step: "0.01",
                    },
                  }}
                />
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 2,
                }}
              >
                <TextField
                  select
                  label="Status"
                  fullWidth
                  value={formData.status}
                  onChange={(event) =>
                    updateFormField("status", event.target.value as DealStatus)
                  }
                  error={Boolean(formErrors.status)}
                  helperText={formErrors.status}
                >
                  {DEAL_STATUSES.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Probability"
                  type="number"
                  fullWidth
                  value={formData.probability}
                  onChange={(event) =>
                    updateFormField("probability", event.target.value)
                  }
                  error={Boolean(formErrors.probability)}
                  helperText={formErrors.probability}
                  slotProps={{
                    htmlInput: {
                      min: "0",
                      max: "100",
                      step: "0.01",
                    },
                  }}
                />
              </Box>

              <TextField
                label="Expected Close Date"
                type="date"
                fullWidth
                value={formData.expectedCloseDate}
                onChange={(event) =>
                  updateFormField("expectedCloseDate", event.target.value)
                }
                error={Boolean(formErrors.expectedCloseDate)}
                helperText={
                  formErrors.expectedCloseDate ||
                  "Choose today or a future date"
                }
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                  htmlInput: {
                    min: getTodayInputValue(),
                  },
                }}
              />

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
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleFormClose} disabled={saving}>
              Cancel
            </Button>

            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "Saving..." : editingDeal ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={Boolean(deleteDeal)}
        onClose={() => {
          if (!saving) setDeleteDeal(null);
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
        <DialogTitle sx={{ fontWeight: 900 }}>Delete Deal</DialogTitle>

        <DialogContent>
          <Typography color="text.secondary">
            Are you sure you want to delete{" "}
            <Box
              component="span"
              sx={{ color: "text.primary", fontWeight: 900 }}
            >
              {deleteDeal?.title}
            </Box>
            ?
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteDeal(null)} disabled={saving}>
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
