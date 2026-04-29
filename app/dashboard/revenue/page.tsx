"use client";

import { useEffect, useState } from "react";
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

type RevenueResponse = {
  success?: boolean;
  message?: string;
  data?: Revenue[] | { revenue?: Revenue[] };
  revenue?: Revenue[];
};

type ProjectsResponse = {
  success?: boolean;
  message?: string;
  data?: Project[] | { projects?: Project[] };
  projects?: Project[];
};

const PAYMENT_METHODS: PaymentMethod[] = [
  "Cash",
  "BenefitPay",
  "Bank Transfer",
  "Card",
  "Other",
];

const emptyForm: RevenueFormData = {
  projectId: "",
  amount: "",
  paymentDate: "",
  paymentMethod: "BenefitPay",
  description: "",
  notes: "",
};

function getRevenueFromResponse(response: RevenueResponse): Revenue[] {
  if (Array.isArray(response.data)) return response.data;

  if (
    response.data &&
    !Array.isArray(response.data) &&
    Array.isArray(response.data.revenue)
  ) {
    return response.data.revenue;
  }

  if (Array.isArray(response.revenue)) return response.revenue;

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

function getDateInputValue(date?: string) {
  if (!date) return "";
  return date.slice(0, 10);
}

function formatDate(date?: string) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
}

export default function RevenuePage() {
  const [revenue, setRevenue] = useState<Revenue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [formData, setFormData] = useState<RevenueFormData>(emptyForm);
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
    setFormData(emptyForm);
    setOpenForm(true);
    setError("");
    setSuccess("");
  }

  function handleEditOpen(item: Revenue) {
    setEditingRevenue(item);

    setFormData({
      projectId: getId(item.projectId),
      amount: String(item.amount || ""),
      paymentDate: getDateInputValue(item.paymentDate),
      paymentMethod: item.paymentMethod || "BenefitPay",
      description: item.description || "",
      notes: item.notes || "",
    });

    setOpenForm(true);
    setError("");
    setSuccess("");
  }

  function handleFormClose() {
    setOpenForm(false);
    setEditingRevenue(null);
    setFormData(emptyForm);
  }

  function updateFormField<K extends keyof RevenueFormData>(
    field: K,
    value: RevenueFormData[K]
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData.projectId) {
      setError("Project is required");
      return;
    }

    if (!formData.amount || Number(formData.amount) <= 0) {
      setError("Amount must be greater than 0");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      projectId: formData.projectId,
      amount: Number(formData.amount),
      paymentDate: formData.paymentDate || undefined,
      paymentMethod: formData.paymentMethod,
      description: formData.description,
      notes: formData.notes,
    };

    try {
      if (editingRevenue) {
        await apiFetch(`/api/revenue/${editingRevenue._id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setSuccess("Revenue updated successfully");
      } else {
        await apiFetch("/api/revenue", {
          method: "POST",
          body: JSON.stringify(payload),
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
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Revenue
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Track payments received from clients by project.
          </Typography>
        </Box>

        <Button variant="contained" onClick={handleCreateOpen}>
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

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : revenue.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <Typography variant="h6">No revenue yet</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Add your first payment record to start tracking income.
              </Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
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
                {revenue.map((item) => (
                  <TableRow key={item._id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>
                        {getProjectName(item.projectId)}
                      </Typography>
                    </TableCell>

                    <TableCell>{getClientName(item.clientId)}</TableCell>

                    <TableCell>{item.amount} BHD</TableCell>

                    <TableCell>
                      <Chip label={item.paymentMethod} size="small" />
                    </TableCell>

                    <TableCell>{formatDate(item.paymentDate)}</TableCell>

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
                          onClick={() => setDeleteRevenue(item)}
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
            {editingRevenue ? "Edit Revenue" : "Add Revenue"}
          </DialogTitle>

          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
              <TextField
                select
                label="Project"
                required
                fullWidth
                value={formData.projectId}
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
                onChange={(event) =>
                  updateFormField("amount", event.target.value)
                }
              />

              <TextField
                select
                label="Payment Method"
                fullWidth
                value={formData.paymentMethod}
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
                onChange={(event) =>
                  updateFormField("paymentDate", event.target.value)
                }
                slotProps={{
                  inputLabel: {
                    shrink: true,
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
        onClose={() => setDeleteRevenue(null)}
      >
        <DialogTitle>Delete Revenue</DialogTitle>

        <DialogContent>
          <Typography>
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