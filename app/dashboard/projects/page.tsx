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

type ProjectType =
  | "Landing Page"
  | "Business Website"
  | "Portfolio Website"
  | "E-commerce Website"
  | "Redesign"
  | "Maintenance";

type ProjectStatus =
  | "Not Started"
  | "In Progress"
  | "Review"
  | "Completed"
  | "Cancelled";

type PaymentStatus = "Unpaid" | "Partially Paid" | "Paid";

type Client = {
  _id: string;
  companyName: string;
  contactPerson?: string;
  email?: string;
};

type Deal = {
  _id: string;
  title: string;
  clientId?: Client | string;
  status?: string;
  finalPrice?: number;
  estimatedBudget?: number;
};

type ProjectClient = Client | string;
type ProjectDeal = Deal | string;

type Project = {
  _id: string;
  clientId: ProjectClient;
  dealId?: ProjectDeal;
  name: string;
  type: ProjectType;
  price: number;
  cost: number;
  profit: number;
  deadline?: string;
  status: ProjectStatus;
  paymentStatus: PaymentStatus;
  description?: string;
  notes?: string;
  createdAt?: string;
};

type ProjectFormData = {
  clientId: string;
  dealId: string;
  name: string;
  type: ProjectType;
  price: string;
  cost: string;
  deadline: string;
  status: ProjectStatus;
  paymentStatus: PaymentStatus;
  description: string;
  notes: string;
};

type ProjectsResponse = {
  success?: boolean;
  message?: string;
  data?: Project[] | { projects?: Project[] };
  projects?: Project[];
};

type ClientsResponse = {
  success?: boolean;
  message?: string;
  data?: Client[] | { clients?: Client[] };
  clients?: Client[];
};

type DealsResponse = {
  success?: boolean;
  message?: string;
  data?: Deal[] | { deals?: Deal[] };
  deals?: Deal[];
};

const PROJECT_TYPES: ProjectType[] = [
  "Landing Page",
  "Business Website",
  "Portfolio Website",
  "E-commerce Website",
  "Redesign",
  "Maintenance",
];

const PROJECT_STATUSES: ProjectStatus[] = [
  "Not Started",
  "In Progress",
  "Review",
  "Completed",
  "Cancelled",
];

const PAYMENT_STATUSES: PaymentStatus[] = [
  "Unpaid",
  "Partially Paid",
  "Paid",
];

const emptyForm: ProjectFormData = {
  clientId: "",
  dealId: "",
  name: "",
  type: "Business Website",
  price: "",
  cost: "0",
  deadline: "",
  status: "Not Started",
  paymentStatus: "Unpaid",
  description: "",
  notes: "",
};

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

function getDealsFromResponse(response: DealsResponse): Deal[] {
  if (Array.isArray(response.data)) return response.data;

  if (
    response.data &&
    !Array.isArray(response.data) &&
    Array.isArray(response.data.deals)
  ) {
    return response.data.deals;
  }

  if (Array.isArray(response.deals)) return response.deals;

  return [];
}

function getClientName(clientId: ProjectClient) {
  if (typeof clientId === "object" && clientId?.companyName) {
    return clientId.companyName;
  }

  return "-";
}

function getDealName(dealId?: ProjectDeal) {
  if (!dealId) return "-";

  if (typeof dealId === "object" && dealId?.title) {
    return dealId.title;
  }

  return "-";
}

function getId(value?: { _id: string } | string) {
  if (!value) return "";
  return typeof value === "object" ? value._id : value;
}

function getDateInputValue(date?: string) {
  if (!date) return "";
  return date.slice(0, 10);
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);

  const [formData, setFormData] = useState<ProjectFormData>(emptyForm);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);

  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchData() {
    setLoading(true);
    setError("");

    try {
      const [projectsResponse, clientsResponse, dealsResponse] =
        await Promise.all([
          apiFetch<ProjectsResponse>("/api/projects"),
          apiFetch<ClientsResponse>("/api/clients"),
          apiFetch<DealsResponse>("/api/deals"),
        ]);

      setProjects(getProjectsFromResponse(projectsResponse));
      setClients(getClientsFromResponse(clientsResponse));
      setDeals(getDealsFromResponse(dealsResponse));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load projects";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function handleCreateOpen() {
    setEditingProject(null);
    setFormData(emptyForm);
    setOpenForm(true);
    setError("");
    setSuccess("");
  }

  function handleEditOpen(project: Project) {
    setEditingProject(project);

    setFormData({
      clientId: getId(project.clientId),
      dealId: getId(project.dealId),
      name: project.name || "",
      type: project.type || "Business Website",
      price: String(project.price || ""),
      cost: String(project.cost || 0),
      deadline: getDateInputValue(project.deadline),
      status: project.status || "Not Started",
      paymentStatus: project.paymentStatus || "Unpaid",
      description: project.description || "",
      notes: project.notes || "",
    });

    setOpenForm(true);
    setError("");
    setSuccess("");
  }

  function handleFormClose() {
    setOpenForm(false);
    setEditingProject(null);
    setFormData(emptyForm);
  }

  function updateFormField<K extends keyof ProjectFormData>(
    field: K,
    value: ProjectFormData[K]
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleDealSelect(dealId: string) {
    const selectedDeal = deals.find((deal) => deal._id === dealId);

    setFormData((current) => ({
      ...current,
      dealId,
      name: selectedDeal?.title || current.name,
      price: selectedDeal?.finalPrice
        ? String(selectedDeal.finalPrice)
        : selectedDeal?.estimatedBudget
          ? String(selectedDeal.estimatedBudget)
          : current.price,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData.clientId) {
      setError("Client is required");
      return;
    }

    if (!formData.dealId) {
      setError("Deal is required");
      return;
    }

    if (!formData.name.trim()) {
      setError("Project name is required");
      return;
    }

    if (!formData.price || Number(formData.price) <= 0) {
      setError("Price must be greater than 0");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      clientId: formData.clientId,
      dealId: formData.dealId,
      name: formData.name,
      type: formData.type,
      price: Number(formData.price),
      cost: Number(formData.cost || 0),
      deadline: formData.deadline || undefined,
      status: formData.status,
      paymentStatus: formData.paymentStatus,
      description: formData.description,
      notes: formData.notes,
    };

    try {
      if (editingProject) {
        await apiFetch(`/api/projects/${editingProject._id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setSuccess("Project updated successfully");
      } else {
        await apiFetch("/api/projects", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setSuccess("Project created successfully");
      }

      handleFormClose();
      await fetchData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save project";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteProject) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch(`/api/projects/${deleteProject._id}`, {
        method: "DELETE",
      });

      setSuccess("Project deleted successfully");
      setDeleteProject(null);
      await fetchData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete project";
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
            Projects
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Manage active website projects, costs, profit, and delivery status.
          </Typography>
        </Box>

        <Button variant="contained" onClick={handleCreateOpen}>
          Add Project
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
          ) : projects.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <Typography variant="h6">No projects yet</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Convert a closed deal or add a project manually.
              </Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Project</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Deal</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Cost</TableCell>
                  <TableCell>Profit</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project._id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>
                        {project.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {project.type}
                      </Typography>
                    </TableCell>

                    <TableCell>{getClientName(project.clientId)}</TableCell>
                    <TableCell>{getDealName(project.dealId)}</TableCell>
                    <TableCell>{project.price} BHD</TableCell>
                    <TableCell>{project.cost} BHD</TableCell>
                    <TableCell>{project.profit} BHD</TableCell>

                    <TableCell>
                      <Chip label={project.status} size="small" />
                    </TableCell>

                    <TableCell>
                      <Chip label={project.paymentStatus} size="small" />
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
                          onClick={() => handleEditOpen(project)}
                        >
                          Edit
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => setDeleteProject(project)}
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

      <Dialog open={openForm} onClose={handleFormClose} maxWidth="md" fullWidth>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>
            {editingProject ? "Edit Project" : "Add Project"}
          </DialogTitle>

          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
              <TextField
                select
                label="Client"
                required
                fullWidth
                value={formData.clientId}
                onChange={(event) =>
                  updateFormField("clientId", event.target.value)
                }
              >
                {clients.map((client) => (
                  <MenuItem key={client._id} value={client._id}>
                    {client.companyName}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Deal"
                required
                fullWidth
                value={formData.dealId}
                onChange={(event) => handleDealSelect(event.target.value)}
              >
                {deals.map((deal) => (
                  <MenuItem key={deal._id} value={deal._id}>
                    {deal.title}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Project Name"
                required
                fullWidth
                value={formData.name}
                onChange={(event) =>
                  updateFormField("name", event.target.value)
                }
              />

              <TextField
                select
                label="Project Type"
                fullWidth
                value={formData.type}
                onChange={(event) =>
                  updateFormField("type", event.target.value as ProjectType)
                }
              >
                {PROJECT_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 2,
                }}
              >
                <TextField
                  label="Price"
                  type="number"
                  required
                  fullWidth
                  value={formData.price}
                  onChange={(event) =>
                    updateFormField("price", event.target.value)
                  }
                />

                <TextField
                  label="Cost"
                  type="number"
                  fullWidth
                  value={formData.cost}
                  onChange={(event) =>
                    updateFormField("cost", event.target.value)
                  }
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
                    updateFormField(
                      "status",
                      event.target.value as ProjectStatus
                    )
                  }
                >
                  {PROJECT_STATUSES.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Payment Status"
                  fullWidth
                  value={formData.paymentStatus}
                  onChange={(event) =>
                    updateFormField(
                      "paymentStatus",
                      event.target.value as PaymentStatus
                    )
                  }
                >
                  {PAYMENT_STATUSES.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <TextField
                label="Deadline"
                type="date"
                fullWidth
                value={formData.deadline}
                onChange={(event) =>
                  updateFormField("deadline", event.target.value)
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
              {saving ? "Saving..." : editingProject ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={Boolean(deleteProject)}
        onClose={() => setDeleteProject(null)}
      >
        <DialogTitle>Delete Project</DialogTitle>

        <DialogContent>
          <Typography>
            Are you sure you want to delete{" "}
            <strong>{deleteProject?.name}</strong>?
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteProject(null)} disabled={saving}>
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