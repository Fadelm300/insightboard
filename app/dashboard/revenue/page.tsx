"use client";

import { useEffect, useState } from "react";
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

type PaymentMethod =
  | "Cash"
  | "BenefitPay"
  | "Bank Transfer"
  | "Card"
  | "Other";

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
      };
  revenue?: Revenue[];
  revenues?: Revenue[];
  items?: Revenue[];
  records?: Revenue[];
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
  const formattedDate = formatDateToInputValue(date);
  return formattedDate || "-";
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

function getAmountSx(): SxProps<Theme> {
  return {
    fontWeight: 900,
    color: "success.main",
  };
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

  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchData() {
    setLoading(true);
    setError("");

    try {
      const [revenueResponse, projectsResponse] = await Promise.all([
        apiFetch<RevenueResponse>("/api/revenue"),
        apiFetch<ProjectsResponse>("/api/projects"),
      ]);

      setRevenue(getRevenueFromResponse(revenueResponse));
      setProjects(getProjectsFromResponse(projectsResponse));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load revenue";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

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
    value: RevenueFormData[K]
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
      await fetchData();
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
      await fetchData();
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
                    <TableCell>Project</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Payment Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {revenue.map((item) => {
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
                                color: "success.main",
                                bgcolor: (theme) =>
                                  alpha(theme.palette.success.main, 0.12),
                                border: (theme) =>
                                  `1px solid ${alpha(
                                    theme.palette.success.main,
                                    0.18
                                  )}`,
                              }}
                            >
                              {getProjectInitial(projectName)}
                            </Box>

                            <Box>
                              <Typography sx={{ fontWeight: 800 }}>
                                {projectName}
                              </Typography>

                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 0.25 }}
                              >
                                Revenue record
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        <TableCell>{getClientName(item.clientId)}</TableCell>

                        <TableCell sx={getAmountSx()}>
                          {formatBHD(item.amount)}
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={item.paymentMethod}
                            size="small"
                            sx={getPaymentMethodChipSx(item.paymentMethod)}
                          />
                        </TableCell>

                        <TableCell>{formatDate(item.paymentDate)}</TableCell>

                        <TableCell
                          sx={{
                            maxWidth: 260,
                            color: "text.secondary",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.description || "-"}
                        </TableCell>

                        <TableCell align="right">
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "flex-end",
                              gap: 1,
                              flexWrap: "wrap",
                            }}
                          >
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleEditOpen(item)}
                              sx={{
                                borderRadius: 2,
                                fontWeight: 800,
                              }}
                            >
                              Edit
                            </Button>

                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => setDeleteRevenue(item)}
                              sx={{
                                borderRadius: 2,
                                fontWeight: 800,
                              }}
                            >
                              Delete
                            </Button>
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
                    event.target.value as PaymentMethod
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
                  formErrors.paymentDate || "Payment date cannot be in the future"
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

        <DialogContent>
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