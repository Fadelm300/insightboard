"use client";

import { FormEvent, useEffect, useState } from "react";
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
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

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
  data?: Project[] | { projects?: Project[] };
  projects?: Project[];
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

const UNSAFE_TEXT_PATTERN =
  /<\s*script|<\/\s*script|javascript:|data:|on\w+\s*=|[<>{}\[\]`$|\\]/i;

function getTodayInputValue() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const emptyForm: ExpenseFormData = {
  projectId: "",
  title: "",
  amount: "",
  category: "Hosting",
  date: getTodayInputValue(),
  description: "",
  notes: "",
};

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

  if (
    response.data &&
    !Array.isArray(response.data) &&
    Array.isArray(response.data.projects)
  ) {
    return response.data.projects;
  }

  if (Array.isArray(response.projects)) return response.projects;

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

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function hasUnsafeText(value: string) {
  return UNSAFE_TEXT_PATTERN.test(value);
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
    title: cleanText(formData.title),
    amount: formData.amount.trim(),
    category: formData.category,
    date: formData.date.trim(),
    description: cleanText(formData.description),
    notes: cleanText(formData.notes),
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

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [formData, setFormData] = useState<ExpenseFormData>(emptyForm);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Expenses
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Track project-related costs and business expenses.
          </Typography>
        </Box>

        <Button variant="contained" onClick={handleCreateOpen}>
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

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : expenses.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <Typography variant="h6">No expenses yet</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Add your first expense record to start tracking costs.
              </Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
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
                  <TableRow key={item._id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>
                        {item.title}
                      </Typography>
                    </TableCell>

                    <TableCell>{getProjectName(item.projectId)}</TableCell>

                    <TableCell>{item.amount} BHD</TableCell>

                    <TableCell>
                      <Chip label={item.category} size="small" />
                    </TableCell>

                    <TableCell>{formatDate(item.date)}</TableCell>

                    <TableCell>{item.description || "-"}</TableCell>

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
                        >
                          Edit
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => setDeleteExpense(item)}
                        >
                          Delete
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={openForm} onClose={handleFormClose} maxWidth="sm" fullWidth>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>
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
                helperText={formErrors.date}
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
        onClose={() => setDeleteExpense(null)}
      >
        <DialogTitle>Delete Expense</DialogTitle>

        <DialogContent>
          <Typography>
            Are you sure you want to delete{" "}
            <strong>{deleteExpense?.title}</strong>?
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