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

type ExpenseCategory =
  | "Domain"
  | "Hosting"
  | "Design Assets"
  | "Tools"
  | "Ads"
  | "Freelance Help"
  | "Other";

type Client = {
  _id: string;
  companyName: string;
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

type ExpenseProject = Project | string;

type Expense = {
  _id: string;
  projectId: ExpenseProject;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date?: string;
  description?: string;
  notes?: string;
  createdAt?: string;
};

type ExpenseFormData = {
  projectId: string;
  title: string;
  amount: string;
  category: ExpenseCategory;
  date: string;
  description: string;
  notes: string;
};

type ExpenseFormErrors = Partial<Record<keyof ExpenseFormData, string>>;

type ExpensesResponse = {
  success?: boolean;
  message?: string;
  data?:
    | Expense[]
    | {
        expense?: Expense[];
        expenses?: Expense[];
        items?: Expense[];
        records?: Expense[];
      };
  expense?: Expense[];
  expenses?: Expense[];
  items?: Expense[];
  records?: Expense[];
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

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Domain",
  "Hosting",
  "Design Assets",
  "Tools",
  "Ads",
  "Freelance Help",
  "Other",
];

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

const emptyForm: ExpenseFormData = {
  projectId: "",
  title: "",
  amount: "",
  category: "Hosting",
  date: "",
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

function getExpensesFromResponse(response: ExpensesResponse): Expense[] {
  if (Array.isArray(response.data)) return response.data;

  if (response.data && !Array.isArray(response.data)) {
    if (Array.isArray(response.data.expense)) return response.data.expense;
    if (Array.isArray(response.data.expenses)) return response.data.expenses;
    if (Array.isArray(response.data.items)) return response.data.items;
    if (Array.isArray(response.data.records)) return response.data.records;
  }

  if (Array.isArray(response.expense)) return response.expense;
  if (Array.isArray(response.expenses)) return response.expenses;
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

function getProjectName(projectId: ExpenseProject) {
  if (typeof projectId === "object" && projectId?.name) {
    return projectId.name;
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
  return formatDateToInputValue(date) || "-";
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
  if (!isValidDate(value)) return true;

  const inputDate = new Date(value);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  inputDate.setHours(0, 0, 0, 0);

  return inputDate > today;
}

function validateExpenseForm(
  formData: ExpenseFormData,
  isEditing: boolean
):
  | {
      isValid: true;
      values: ExpenseFormData;
    }
  | {
      isValid: false;
      errors: ExpenseFormErrors;
    } {
  const errors: ExpenseFormErrors = {};

  const cleanedValues: ExpenseFormData = {
    projectId: formData.projectId.trim(),
    title: cleanSingleLineText(formData.title),
    amount: formData.amount.trim(),
    category: formData.category,
    date: formData.date.trim(),
    description: cleanMultiLineText(formData.description),
    notes: cleanMultiLineText(formData.notes),
  };

  if (!isEditing && !cleanedValues.projectId) {
    errors.projectId = "Project is required";
  }

  if (!cleanedValues.title) {
    errors.title = "Title is required";
  } else if (cleanedValues.title.length > 120) {
    errors.title = "Title cannot exceed 120 characters";
  } else if (hasUnsafeText(cleanedValues.title)) {
    errors.title = "Title contains invalid characters";
  }

  if (!cleanedValues.amount) {
    errors.amount = "Amount is required";
  } else if (!isValidMoney(cleanedValues.amount)) {
    errors.amount = "Amount must be a valid number with up to 2 decimals";
  } else if (Number(cleanedValues.amount) <= 0) {
    errors.amount = "Amount must be greater than 0";
  }

  if (!EXPENSE_CATEGORIES.includes(cleanedValues.category)) {
    errors.category = "Invalid expense category";
  }

  if (cleanedValues.date && !isValidDate(cleanedValues.date)) {
    errors.date = "Invalid expense date";
  } else if (cleanedValues.date && isFutureDate(cleanedValues.date)) {
    errors.date = "Expense date cannot be in the future";
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

function getExpenseCategoryChipSx(category: ExpenseCategory): SxProps<Theme> {
  const categoryColors: Record<ExpenseCategory, string> = {
    Domain: "#2563EB",
    Hosting: "#0EA5E9",
    "Design Assets": "#6366F1",
    Tools: "#10B981",
    Ads: "#F59E0B",
    "Freelance Help": "#EF4444",
    Other: "#64748B",
  };

  const color = categoryColors[category];

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

function getExpenseInitial(title: string) {
  return title.trim().charAt(0).toUpperCase() || "E";
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
    color: "error.main",
  };
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [formData, setFormData] = useState<ExpenseFormData>({
    ...emptyForm,
    date: getTodayInputValue(),
  });
  const [formErrors, setFormErrors] = useState<ExpenseFormErrors>({});
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null);

  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchData() {
    setLoading(true);
    setError("");

    try {
      const [expensesResponse, projectsResponse] = await Promise.all([
        apiFetch<ExpensesResponse>("/api/expenses"),
        apiFetch<ProjectsResponse>("/api/projects"),
      ]);

      setExpenses(getExpensesFromResponse(expensesResponse));
      setProjects(getProjectsFromResponse(projectsResponse));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load expenses";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function handleCreateOpen() {
    setEditingExpense(null);
    setFormData({
      ...emptyForm,
      date: getTodayInputValue(),
    });
    setFormErrors({});
    setOpenForm(true);
    setError("");
    setSuccess("");
  }

  function handleEditOpen(item: Expense) {
    setEditingExpense(item);

    setFormData({
      projectId: getId(item.projectId),
      title: item.title || "",
      amount: String(item.amount || ""),
      category: item.category || "Hosting",
      date: formatDateToInputValue(item.date) || getTodayInputValue(),
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
    setEditingExpense(null);
    setFormData({
      ...emptyForm,
      date: getTodayInputValue(),
    });
    setFormErrors({});
  }

  function updateFormField<K extends keyof ExpenseFormData>(
    field: K,
    value: ExpenseFormData[K]
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

    const validation = validateExpenseForm(formData, Boolean(editingExpense));

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
      title: values.title,
      amount: Number(values.amount),
      category: values.category,
      date: values.date || undefined,
      description: values.description,
      notes: values.notes,
    };

    const updatePayload = {
      title: values.title,
      amount: Number(values.amount),
      category: values.category,
      date: values.date || undefined,
      description: values.description,
      notes: values.notes,
    };

    try {
      if (editingExpense) {
        await apiFetch(`/api/expenses/${editingExpense._id}`, {
          method: "PUT",
          body: JSON.stringify(updatePayload),
        });

        setSuccess("Expense updated successfully");
      } else {
        await apiFetch("/api/expenses", {
          method: "POST",
          body: JSON.stringify(createPayload),
        });

        setSuccess("Expense created successfully");
      }

      handleFormClose();
      await fetchData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save expense";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteExpense) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch(`/api/expenses/${deleteExpense._id}`, {
        method: "DELETE",
      });

      setSuccess("Expense deleted successfully");
      setDeleteExpense(null);
      await fetchData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete expense";
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
            Expenses
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Track project-related costs and business expenses.
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
          Add Expense
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
          ) : expenses.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8, px: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                No expenses yet
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Add your first expense record to start tracking costs.
              </Typography>

              <Button
                variant="contained"
                onClick={handleCreateOpen}
                sx={{ mt: 3, borderRadius: 2, fontWeight: 800 }}
              >
                Add Expense
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
                    <TableCell>Expense</TableCell>
                    <TableCell>Project</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {expenses.map((item) => (
                    <TableRow
                      key={item._id}
                      hover
                      sx={{
                        "&:last-child td": {
                          borderBottom: 0,
                        },
                      }}
                    >
                      <TableCell sx={{ minWidth: 240 }}>
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
                              color: "error.main",
                              bgcolor: (theme) =>
                                alpha(theme.palette.error.main, 0.12),
                              border: (theme) =>
                                `1px solid ${alpha(
                                  theme.palette.error.main,
                                  0.18
                                )}`,
                            }}
                          >
                            {getExpenseInitial(item.title)}
                          </Box>

                          <Box>
                            <Typography sx={{ fontWeight: 800 }}>
                              {item.title}
                            </Typography>

                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.25 }}
                            >
                              Expense record
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell>{getProjectName(item.projectId)}</TableCell>

                      <TableCell sx={getAmountSx()}>
                        {formatBHD(item.amount)}
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={item.category}
                          size="small"
                          sx={getExpenseCategoryChipSx(item.category)}
                        />
                      </TableCell>

                      <TableCell>{formatDate(item.date)}</TableCell>

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
                            onClick={() => setDeleteExpense(item)}
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
                  ))}
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
            {editingExpense ? "Edit Expense" : "Add Expense"}
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
                disabled={Boolean(editingExpense)}
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
                label="Title"
                required
                fullWidth
                value={formData.title}
                error={Boolean(formErrors.title)}
                helperText={formErrors.title}
                onChange={(event) =>
                  updateFormField("title", event.target.value)
                }
              />

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
                    min: "0.01",
                    step: "0.01",
                  },
                }}
              />

              <TextField
                select
                label="Category"
                fullWidth
                value={formData.category}
                error={Boolean(formErrors.category)}
                helperText={formErrors.category}
                onChange={(event) =>
                  updateFormField(
                    "category",
                    event.target.value as ExpenseCategory
                  )
                }
              >
                {EXPENSE_CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Date"
                type="date"
                fullWidth
                value={formData.date}
                error={Boolean(formErrors.date)}
                helperText={
                  formErrors.date || "Expense date cannot be in the future"
                }
                onChange={(event) =>
                  updateFormField("date", event.target.value)
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
              {saving ? "Saving..." : editingExpense ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={Boolean(deleteExpense)}
        onClose={() => {
          if (!saving) setDeleteExpense(null);
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
        <DialogTitle sx={{ fontWeight: 900 }}>Delete Expense</DialogTitle>

        <DialogContent>
          <Typography color="text.secondary">
            Are you sure you want to delete{" "}
            <Box component="span" sx={{ color: "text.primary", fontWeight: 900 }}>
              {deleteExpense?.title}
            </Box>
            ?
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteExpense(null)} disabled={saving}>
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