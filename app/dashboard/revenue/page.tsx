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

type PaymentMethod = "Cash" | "BenefitPay" | "Bank Transfer" | "Card" | "Other";

type Client = {
  _id: string;
  companyName: string;
  contactPerson?: string;
  email?: string;
};

type Project = {
  _id: string;
  name: string;
  type?: string;
  price?: number;
  status?: string;
  paymentStatus?: string;
  clientId?: Client | string;
};

type RevenueProject = Project | string;
type RevenueClient = Client | string;

type Revenue = {
  _id: string;
  projectId: RevenueProject;
  clientId?: RevenueClient;
  amount: number;
  paymentDate?: string;
  paymentMethod: PaymentMethod;
  description?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

type RevenueFormData = {
  projectId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  description: string;
  notes: string;
};

type RevenueFormErrors = Partial<Record<keyof RevenueFormData, string>>;

type RevenueResponse = {
  success?: boolean;
  message?: string;
  data?:
    | Revenue[]
    | {
        revenue?: Revenue[];
        revenues?: Revenue[];
        items?: Revenue[];
        records?: Revenue[];
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
      };
  revenue?: Revenue[];
  revenues?: Revenue[];
  items?: Revenue[];
  records?: Revenue[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
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

const PAYMENT_METHODS: PaymentMethod[] = [
  "Cash",
  "BenefitPay",
  "Bank Transfer",
  "Card",
  "Other",
];

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

const emptyForm: RevenueFormData = {
  projectId: "",
  amount: "",
  paymentDate: "",
  paymentMethod: "BenefitPay",
  description: "",
  notes: "",
};

const REVENUE_PER_PAGE = 7;

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
};

const tableBodyCellSx = {
  px: { xs: 0.75, sm: 1, md: 2 },
  py: { xs: 1.25, md: 2 },
};

const hideFromMobileSx = {
  display: { xs: "none", md: "table-cell" },
};

const hideFromTabletSx = {
  display: { xs: "none", xl: "table-cell" },
};

const hideOnPhoneSx = {
  display: { xs: "none", sm: "table-cell" },
};

function getTodayInputValue() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getRevenueFromResponse(response: RevenueResponse): Revenue[] {
  if (Array.isArray(response.data)) return response.data;

  if (response.data && !Array.isArray(response.data)) {
    if (Array.isArray(response.data.revenue)) return response.data.revenue;
    if (Array.isArray(response.data.revenues)) return response.data.revenues;
    if (Array.isArray(response.data.items)) return response.data.items;
    if (Array.isArray(response.data.records)) return response.data.records;
  }

  if (Array.isArray(response.revenue)) return response.revenue;
  if (Array.isArray(response.revenues)) return response.revenues;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.records)) return response.records;

  return [];
}

function getPaginationFromResponse(response: RevenueResponse) {
  if (response.data && !Array.isArray(response.data)) {
    return {
      total: response.data.total || 0,
      page: response.data.page || 1,
      limit: response.data.limit || REVENUE_PER_PAGE,
      totalPages: response.data.totalPages || 1,
    };
  }

  return {
    total: response.total || 0,
    page: response.page || 1,
    limit: response.limit || REVENUE_PER_PAGE,
    totalPages: response.totalPages || 1,
  };
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

function getId(value?: { _id: string } | string) {
  if (!value) return "";
  return typeof value === "object" ? value._id : value;
}

function getProjectName(projectId: RevenueProject) {
  if (typeof projectId === "object" && projectId?.name) {
    return projectId.name;
  }

  return "-";
}

function getClientName(clientId?: RevenueClient) {
  if (typeof clientId === "object" && clientId?.companyName) {
    return clientId.companyName;
  }

  return "-";
}

function formatDateToInputValue(date?: string) {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

function getPaymentDateTime(paymentDate?: string) {
  if (!paymentDate) return Number.NEGATIVE_INFINITY;

  const time = new Date(paymentDate).getTime();

  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

function getCreatedAtTime(createdAt?: string) {
  if (!createdAt) return 0;

  const time = new Date(createdAt).getTime();

  return Number.isNaN(time) ? 0 : time;
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

function hasUnsafeText(value: string) {
  return hasUnsafeCharacters(value) || hasUnsafePattern(value);
}

function isValidMoney(value: string) {
  return MONEY_PATTERN.test(value.trim());
}

function isValidDate(value: string) {
  if (!value) return true;

  const parsedDate = new Date(value);
  return !Number.isNaN(parsedDate.getTime());
}

function isFutureDate(value: string) {
  const inputDate = new Date(value);

  if (Number.isNaN(inputDate.getTime())) {
    return true;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  inputDate.setHours(0, 0, 0, 0);

  return inputDate > today;
}

function validateRevenueForm(formData: RevenueFormData):
  | {
      isValid: true;
      values: RevenueFormData;
    }
  | {
      isValid: false;
      errors: RevenueFormErrors;
    } {
  const errors: RevenueFormErrors = {};

  const cleanedValues: RevenueFormData = {
    projectId: formData.projectId.trim(),
    amount: formData.amount.trim(),
    paymentDate: formData.paymentDate.trim(),
    paymentMethod: formData.paymentMethod,
    description: cleanMultiLineText(formData.description),
    notes: cleanMultiLineText(formData.notes),
  };

  if (!cleanedValues.projectId) {
    errors.projectId = "Project is required";
  }

  if (!cleanedValues.amount) {
    errors.amount = "Amount is required";
  } else if (!isValidMoney(cleanedValues.amount)) {
    errors.amount = "Amount must be a valid number with up to 2 decimals";
  } else if (Number(cleanedValues.amount) <= 0) {
    errors.amount = "Amount must be greater than 0";
  }

  if (!PAYMENT_METHODS.includes(cleanedValues.paymentMethod)) {
    errors.paymentMethod = "Invalid payment method";
  }

  if (cleanedValues.paymentDate && !isValidDate(cleanedValues.paymentDate)) {
    errors.paymentDate = "Invalid payment date";
  } else if (
    cleanedValues.paymentDate &&
    isFutureDate(cleanedValues.paymentDate)
  ) {
    errors.paymentDate = "Payment date cannot be in the future";
  }

  if (cleanedValues.description.length > 1000) {
    errors.description = "Description cannot exceed 1000 characters";
  } else if (
    cleanedValues.description &&
    hasUnsafeText(cleanedValues.description)
  ) {
    errors.description = "Description contains invalid characters";
  }

  if (cleanedValues.notes.length > 1000) {
    errors.notes = "Notes cannot exceed 1000 characters";
  } else if (cleanedValues.notes && hasUnsafeText(cleanedValues.notes)) {
    errors.notes = "Notes contain invalid characters";
  }

  if (Object.keys(errors).length > 0) {
    return {
      isValid: false,
      errors,
    };
  }

  return {
    isValid: true,
    values: cleanedValues,
  };
}

function getPaymentMethodChipSx(method: PaymentMethod): SxProps<Theme> {
  const methodColors: Record<PaymentMethod, string> = {
    Cash: "#64748B",
    BenefitPay: "#10B981",
    "Bank Transfer": "#2563EB",
    Card: "#6366F1",
    Other: "#F59E0B",
  };

  const color = methodColors[method];

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

function getProjectInitial(projectName: string) {
  return projectName.trim().charAt(0).toUpperCase() || "R";
}

function formatBHD(value?: number) {
  return `${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} BHD`;
}

function getAmountSx() {
  return {
    fontWeight: 900,
    color: "success.main",
  } satisfies SxProps<Theme>;
}

export default function RevenuePage() {
  const [revenue, setRevenue] = useState<Revenue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [formData, setFormData] = useState<RevenueFormData>({
    ...emptyForm,
    paymentDate: getTodayInputValue(),
  });
  const [formErrors, setFormErrors] = useState<RevenueFormErrors>({});
  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);
  const [deleteRevenue, setDeleteRevenue] = useState<Revenue | null>(null);
  const [viewRevenue, setViewRevenue] = useState<Revenue | null>(null);
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const [actionRevenue, setActionRevenue] = useState<Revenue | null>(null);

  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const sortedRevenue = useMemo(() => {
    return [...revenue].sort((firstItem, secondItem) => {
      const paymentDateDifference =
        getPaymentDateTime(secondItem.paymentDate) -
        getPaymentDateTime(firstItem.paymentDate);

      if (paymentDateDifference !== 0) {
        return paymentDateDifference;
      }

      return (
        getCreatedAtTime(secondItem.createdAt) -
        getCreatedAtTime(firstItem.createdAt)
      );
    });
  }, [revenue]);

  async function fetchData(pageNumber = page, search = searchQuery) {
    setLoading(true);
    setError("");

    const queryParams = new URLSearchParams({
      page: String(pageNumber),
      limit: String(REVENUE_PER_PAGE),
    });

    const cleanSearch = search.trim();

    if (cleanSearch) {
      queryParams.set("search", cleanSearch);
    }

    try {
      const [revenueResponse, projectsResponse] = await Promise.all([
        apiFetch<RevenueResponse>(`/api/revenue?${queryParams.toString()}`),
        apiFetch<ProjectsResponse>("/api/projects?limit=50"),
      ]);

      const pagination = getPaginationFromResponse(revenueResponse);

      setRevenue(getRevenueFromResponse(revenueResponse));
      setProjects(getProjectsFromResponse(projectsResponse));
      setTotalRevenue(pagination.total);
      setTotalPages(Math.max(pagination.totalPages, 1));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load revenue";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchData(page, searchQuery);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [page, searchQuery]);

  function handleCreateOpen() {
    setEditingRevenue(null);
    setFormData({
      ...emptyForm,
      paymentDate: getTodayInputValue(),
    });
    setFormErrors({});
    setOpenForm(true);
    setError("");
    setSuccess("");
  }

  function handleEditOpen(item: Revenue) {
    setEditingRevenue(item);

    setFormData({
      projectId: getId(item.projectId),
      amount: String(item.amount || ""),
      paymentDate:
        formatDateToInputValue(item.paymentDate) || getTodayInputValue(),
      paymentMethod: item.paymentMethod || "BenefitPay",
      description: item.description || "",
      notes: item.notes || "",
    });

    setFormErrors({});
    setOpenForm(true);
    setError("");
    setSuccess("");
  }

  function handleFormClose() {
    if (saving) return;

    setOpenForm(false);
    setEditingRevenue(null);
    setFormData({
      ...emptyForm,
      paymentDate: getTodayInputValue(),
    });
    setFormErrors({});
  }

  function updateFormField<K extends keyof RevenueFormData>(
    field: K,
    value: RevenueFormData[K],
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    setFormErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  function handleActionMenuOpen(
    event: React.MouseEvent<HTMLElement>,
    item: Revenue,
  ) {
    setActionAnchorEl(event.currentTarget);
    setActionRevenue(item);
  }

  function handleActionMenuClose() {
    setActionAnchorEl(null);
    setActionRevenue(null);
  }

  function handleMenuEdit() {
    if (!actionRevenue) return;

    const selectedRevenue = actionRevenue;
    handleActionMenuClose();
    handleEditOpen(selectedRevenue);
  }

  function handleMenuDelete() {
    if (!actionRevenue) return;

    const selectedRevenue = actionRevenue;
    handleActionMenuClose();
    setDeleteRevenue(selectedRevenue);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateRevenueForm(formData);

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      setError("Please fix the highlighted fields");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    setFormErrors({});

    const values = validation.values;

    const createPayload = {
      projectId: values.projectId,
      amount: Number(values.amount),
      paymentDate: values.paymentDate || undefined,
      paymentMethod: values.paymentMethod,
      description: values.description,
      notes: values.notes,
    };

    const updatePayload = {
      amount: Number(values.amount),
      paymentDate: values.paymentDate || undefined,
      paymentMethod: values.paymentMethod,
      description: values.description,
      notes: values.notes,
    };

    try {
      if (editingRevenue) {
        await apiFetch(`/api/revenue/${editingRevenue._id}`, {
          method: "PUT",
          body: JSON.stringify(updatePayload),
        });

        setSuccess("Revenue updated successfully");
      } else {
        await apiFetch("/api/revenue", {
          method: "POST",
          body: JSON.stringify(createPayload),
        });

        setSuccess("Revenue created successfully");
      }

      handleFormClose();
      setPage(1);
      await fetchData(1, searchQuery);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save revenue";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteRevenue) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch(`/api/revenue/${deleteRevenue._id}`, {
        method: "DELETE",
      });

      setSuccess("Revenue deleted successfully");
      setDeleteRevenue(null);
      await fetchData(page, searchQuery);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete revenue";
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
            Revenue
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Track payments received from clients by project.
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
          Add Revenue
        </Button>
      </Box>

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
          placeholder="Search by project, client, amount, method, or description..."
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
          ) : revenue.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8, px: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                No revenue yet
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Add your first payment record to start tracking income.
              </Typography>

              <Button
                variant="contained"
                onClick={handleCreateOpen}
                sx={{ mt: 3, borderRadius: 2, fontWeight: 800 }}
              >
                Add Revenue
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
                  minWidth: { xs: "100%", md: "100%" },
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
                      sx={{
                        ...tableHeaderCellSx,
                        width: { xs: "48%", sm: "40%", md: "26%", xl: "22%" },
                      }}
                    >
                      Project
                    </TableCell>

                    <TableCell
                      sx={{
                        ...tableHeaderCellSx,
                        ...hideFromMobileSx,
                        width: { md: "16%", xl: "14%" },
                      }}
                    >
                      Client
                    </TableCell>

                    <TableCell
                      sx={{
                        ...tableHeaderCellSx,
                        width: { xs: "24%", sm: "20%", md: "12%" },
                      }}
                    >
                      Amount
                    </TableCell>

                    <TableCell
                      sx={{
                        ...tableHeaderCellSx,
                        ...hideOnPhoneSx,
                        width: { sm: "22%", md: "14%", xl: "12%" },
                      }}
                    >
                      Method
                    </TableCell>

                    <TableCell
                      sx={{
                        ...tableHeaderCellSx,
                        ...hideFromMobileSx,
                        width: { md: "16%", xl: "14%" },
                      }}
                    >
                      Payment Date
                    </TableCell>

                    <TableCell
                      sx={{
                        ...tableHeaderCellSx,
                        ...hideFromTabletSx,
                        width: { xl: "18%" },
                      }}
                    >
                      Description
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={{
                        ...tableHeaderCellSx,
                        width: { xs: "28%", sm: "18%", md: "16%", xl: "14%" },
                      }}
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {sortedRevenue.map((item, index) => {
                    const projectName = getProjectName(item.projectId);

                    return (
                      <TableRow
                        key={item._id}
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
                          {(page - 1) * REVENUE_PER_PAGE + index + 1}
                        </TableCell>

                        <TableCell
                          sx={{
                            ...tableBodyCellSx,
                            width: { xs: "48%", sm: "40%", md: "26%", xl: "22%" },
                            minWidth: { md: 220 },
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: { xs: 0.75, md: 1.5 },
                              minWidth: 0,
                            }}
                          >
                            <Box
                              sx={{
                                width: { xs: 32, md: 40 },
                                height: { xs: 32, md: 40 },
                                borderRadius: 2.5,
                                display: "grid",
                                placeItems: "center",
                                flexShrink: 0,
                                fontWeight: 900,
                                fontSize: { xs: 12, md: 14 },
                                color: "success.main",
                                bgcolor: (theme) =>
                                  alpha(theme.palette.success.main, 0.12),
                                border: (theme) =>
                                  `1px solid ${alpha(
                                    theme.palette.success.main,
                                    0.18,
                                  )}`,
                              }}
                            >
                              {getProjectInitial(projectName)}
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
                                {projectName}
                              </Typography>

                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  mt: 0.25,
                                  display: { xs: "none", sm: "block" },
                                }}
                              >
                                Revenue record
                              </Typography>

                              <Chip
                                label={item.paymentMethod}
                                size="small"
                                sx={{
                                  ...getPaymentMethodChipSx(item.paymentMethod),
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
                          </Box>
                        </TableCell>

                        <TableCell
                          sx={{
                            ...tableBodyCellSx,
                            ...hideFromMobileSx,
                            width: { md: "16%", xl: "14%" },
                          }}
                        >
                          {getClientName(item.clientId)}
                        </TableCell>

                        <TableCell
                          sx={{
                            ...tableBodyCellSx,
                            ...getAmountSx(),
                            width: { xs: "24%", sm: "20%", md: "12%" },
                            whiteSpace: "nowrap",
                            fontSize: { xs: 12, md: 14 },
                          }}
                        >
                          {formatBHD(item.amount)}
                        </TableCell>

                        <TableCell
                          sx={{
                            ...tableBodyCellSx,
                            ...hideOnPhoneSx,
                            width: { sm: "22%", md: "14%", xl: "12%" },
                          }}
                        >
                          <Chip
                            label={item.paymentMethod}
                            size="small"
                            sx={getPaymentMethodChipSx(item.paymentMethod)}
                          />
                        </TableCell>

                        <TableCell
                          sx={{
                            ...tableBodyCellSx,
                            ...hideFromMobileSx,
                            width: { md: "16%", xl: "14%" },
                            fontWeight: 800,
                          }}
                        >
                          {formatDate(item.paymentDate)}
                        </TableCell>

                        <TableCell
                          sx={{
                            ...tableBodyCellSx,
                            ...hideFromTabletSx,
                            width: { xl: "18%" },
                            color: "text.secondary",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.description || "-"}
                        </TableCell>

                        <TableCell
                          align="right"
                          sx={{
                            ...tableBodyCellSx,
                            width: { xs: "28%", sm: "18%", md: "16%", xl: "14%" },
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "flex-end",
                              alignItems: "center",
                              gap: { xs: 0.5, md: 1 },
                              flexWrap: "nowrap",
                            }}
                          >
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setViewRevenue(item)}
                              sx={{
                                borderRadius: 2,
                                fontWeight: 800,
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
                                handleActionMenuOpen(event, item)
                              }
                              aria-label={`Open actions for ${projectName}`}
                              sx={{
                                display: { xs: "none", md: "inline-flex" },
                                width: 34,
                                height: 34,
                                flexShrink: 0,
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
                  Showing page {page} of {totalPages} · {totalRevenue} revenue records
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
        open={Boolean(viewRevenue)}
        onClose={() => setViewRevenue(null)}
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
        <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>
          Revenue Details
        </DialogTitle>

        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                label="Project"
                fullWidth
                value={
                  viewRevenue ? getProjectName(viewRevenue.projectId) : "-"
                }
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="Client"
                fullWidth
                value={viewRevenue ? getClientName(viewRevenue.clientId) : "-"}
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
                label="Amount"
                fullWidth
                value={formatBHD(viewRevenue?.amount)}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="Payment Method"
                fullWidth
                value={viewRevenue?.paymentMethod || "-"}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="Payment Date"
                fullWidth
                value={formatDate(viewRevenue?.paymentDate)}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />
            </Box>

            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={3}
              value={viewRevenue?.description || "-"}
              sx={readonlyMultilineTextFieldSx}
              slotProps={{ input: { readOnly: true } }}
            />

            <TextField
              label="Notes"
              fullWidth
              multiline
              minRows={3}
              value={viewRevenue?.notes || "-"}
              sx={readonlyMultilineTextFieldSx}
              slotProps={{ input: { readOnly: true } }}
            />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                label="Created At"
                fullWidth
                value={formatDate(viewRevenue?.createdAt)}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="Updated At"
                fullWidth
                value={formatDate(viewRevenue?.updatedAt)}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="contained" onClick={() => setViewRevenue(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openForm}
        onClose={handleFormClose}
        maxWidth="sm"
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
          <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>
            {editingRevenue ? "Edit Revenue" : "Add Revenue"}
          </DialogTitle>

          <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
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
                label="Project"
                required
                fullWidth
                disabled={Boolean(editingRevenue)}
                value={formData.projectId}
                error={Boolean(formErrors.projectId)}
                helperText={formErrors.projectId}
                onChange={(event) =>
                  updateFormField("projectId", event.target.value)
                }
              >
                {projects.map((project) => (
                  <MenuItem key={project._id} value={project._id}>
                    {project.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Amount"
                type="number"
                required
                fullWidth
                value={formData.amount}
                error={Boolean(formErrors.amount)}
                helperText={formErrors.amount}
                onChange={(event) =>
                  updateFormField("amount", event.target.value)
                }
                slotProps={{
                  htmlInput: {
                    step: "0.01",
                    min: "0.01",
                  },
                }}
              />

              <TextField
                select
                label="Payment Method"
                fullWidth
                value={formData.paymentMethod}
                error={Boolean(formErrors.paymentMethod)}
                helperText={formErrors.paymentMethod}
                onChange={(event) =>
                  updateFormField(
                    "paymentMethod",
                    event.target.value as PaymentMethod,
                  )
                }
              >
                {PAYMENT_METHODS.map((method) => (
                  <MenuItem key={method} value={method}>
                    {method}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Payment Date"
                type="date"
                fullWidth
                value={formData.paymentDate}
                error={Boolean(formErrors.paymentDate)}
                helperText={
                  formErrors.paymentDate ||
                  "Payment date cannot be in the future"
                }
                onChange={(event) =>
                  updateFormField("paymentDate", event.target.value)
                }
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                  htmlInput: {
                    max: getTodayInputValue(),
                  },
                }}
              />

              <TextField
                label="Description"
                fullWidth
                multiline
                minRows={3}
                value={formData.description}
                error={Boolean(formErrors.description)}
                helperText={formErrors.description}
                onChange={(event) =>
                  updateFormField("description", event.target.value)
                }
              />

              <TextField
                label="Notes"
                fullWidth
                multiline
                minRows={3}
                value={formData.notes}
                error={Boolean(formErrors.notes)}
                helperText={formErrors.notes}
                onChange={(event) =>
                  updateFormField("notes", event.target.value)
                }
              />
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleFormClose} disabled={saving}>
              Cancel
            </Button>

            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "Saving..." : editingRevenue ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={Boolean(deleteRevenue)}
        onClose={() => {
          if (!saving) setDeleteRevenue(null);
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
        <DialogTitle sx={{ fontWeight: 900 }}>Delete Revenue</DialogTitle>

        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          <Typography color="text.secondary">
            Are you sure you want to delete this revenue record?
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteRevenue(null)} disabled={saving}>
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
