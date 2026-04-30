"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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

type ProjectFormErrors = Partial<Record<keyof ProjectFormData, string>>;

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

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

const UNSAFE_TEXT_PATTERN =
  /<\s*script|<\/\s*script|javascript:|data:|on\w+\s*=|[{}[\]`$|\\]/i;

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

function getId(value?: { _id: string } | string | null) {
  if (!value) return "";
  return typeof value === "object" ? value._id : value;
}

function getDateInputValue(date?: string) {
  if (!date) return "";
  return date.slice(0, 10);
}

function getTodayInputValue() {
  const today = new Date();
  const timezoneOffset = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - timezoneOffset).toISOString().slice(0, 10);
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

function isPastDate(value: string) {
  const inputDate = new Date(value);

  if (Number.isNaN(inputDate.getTime())) {
    return true;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  inputDate.setHours(0, 0, 0, 0);

  return inputDate < today;
}

function validateProjectForm(formData: ProjectFormData):
  | {
      isValid: true;
      values: ProjectFormData;
    }
  | {
      isValid: false;
      errors: ProjectFormErrors;
    } {
  const errors: ProjectFormErrors = {};

  const cleanedValues: ProjectFormData = {
    clientId: formData.clientId.trim(),
    dealId: formData.dealId.trim(),
    name: cleanText(formData.name),
    type: formData.type,
    price: formData.price.trim(),
    cost: formData.cost.trim() || "0",
    deadline: formData.deadline.trim(),
    status: formData.status,
    paymentStatus: formData.paymentStatus,
    description: cleanText(formData.description),
    notes: cleanText(formData.notes),
  };

  if (!cleanedValues.clientId) {
    errors.clientId = "Client is required";
  }

  if (!cleanedValues.name) {
    errors.name = "Project name is required";
  } else if (cleanedValues.name.length > 120) {
    errors.name = "Project name cannot exceed 120 characters";
  } else if (hasUnsafeText(cleanedValues.name)) {
    errors.name = "Project name contains invalid characters";
  }

  if (!PROJECT_TYPES.includes(cleanedValues.type)) {
    errors.type = "Invalid project type";
  }

  if (!cleanedValues.price) {
    errors.price = "Price is required";
  } else if (!isValidMoney(cleanedValues.price)) {
    errors.price = "Price must be a valid number with up to 2 decimals";
  } else if (Number(cleanedValues.price) <= 0) {
    errors.price = "Price must be greater than 0";
  }

  if (!isValidMoney(cleanedValues.cost)) {
    errors.cost = "Cost must be a valid number with up to 2 decimals";
  } else if (Number(cleanedValues.cost) < 0) {
    errors.cost = "Cost cannot be negative";
  }

  if (cleanedValues.deadline && isPastDate(cleanedValues.deadline)) {
    errors.deadline = "Deadline cannot be in the past";
  }

  if (!PROJECT_STATUSES.includes(cleanedValues.status)) {
    errors.status = "Invalid project status";
  }

  if (!PAYMENT_STATUSES.includes(cleanedValues.paymentStatus)) {
    errors.paymentStatus = "Invalid payment status";
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

function getStatusChipColor(status: ProjectStatus) {
  switch (status) {
    case "Completed":
      return "success";
    case "In Progress":
      return "primary";
    case "Review":
      return "warning";
    case "Cancelled":
      return "error";
    default:
      return "default";
  }
}

function getPaymentChipColor(status: PaymentStatus) {
  switch (status) {
    case "Paid":
      return "success";
    case "Partially Paid":
      return "warning";
    default:
      return "default";
  }
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);

  const [formData, setFormData] = useState<ProjectFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<ProjectFormErrors>({});
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);

  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const todayInputValue = getTodayInputValue();

  const availableDeals = useMemo(() => {
    return deals.filter((deal) => {
      const isClosedWon = deal.status === "Closed Won";
      const isSelectedDeal = deal._id === formData.dealId;
      const dealClientId = getId(deal.clientId);
      const belongsToSelectedClient =
        !formData.clientId || !dealClientId || dealClientId === formData.clientId;

      return (isClosedWon || isSelectedDeal) && belongsToSelectedClient;
    });
  }, [deals, formData.clientId, formData.dealId]);

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
    setFormErrors({});
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
      cost: String(project.cost ?? 0),
      deadline: getDateInputValue(project.deadline),
      status: project.status || "Not Started",
      paymentStatus: project.paymentStatus || "Unpaid",
      description: project.description || "",
      notes: project.notes || "",
    });

    setFormErrors({});
    setOpenForm(true);
    setError("");
    setSuccess("");
  }

  function handleFormClose() {
    setOpenForm(false);
    setEditingProject(null);
    setFormData(emptyForm);
    setFormErrors({});
  }

  function updateFormField<K extends keyof ProjectFormData>(
    field: K,
    value: ProjectFormData[K]
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

  function handleClientSelect(clientId: string) {
    const selectedDeal = deals.find((deal) => deal._id === formData.dealId);
    const selectedDealClientId = getId(selectedDeal?.clientId);

    setFormData((current) => ({
      ...current,
      clientId,
      dealId:
        selectedDealClientId && selectedDealClientId !== clientId
          ? ""
          : current.dealId,
    }));

    setFormErrors((current) => ({
      ...current,
      clientId: undefined,
      dealId: undefined,
    }));
  }

  function handleDealSelect(dealId: string) {
    const selectedDeal = deals.find((deal) => deal._id === dealId);
    const selectedDealClientId = getId(selectedDeal?.clientId);

    setFormData((current) => ({
      ...current,
      dealId,
      clientId: selectedDealClientId || current.clientId,
      name: selectedDeal?.title || current.name,
      price:
        selectedDeal?.finalPrice !== undefined
          ? String(selectedDeal.finalPrice)
          : selectedDeal?.estimatedBudget !== undefined
            ? String(selectedDeal.estimatedBudget)
            : current.price,
    }));

    setFormErrors((current) => ({
      ...current,
      dealId: undefined,
      clientId: undefined,
      name: undefined,
      price: undefined,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateProjectForm(formData);

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

    const payload = {
      clientId: values.clientId,
      dealId: values.dealId,
      name: values.name,
      type: values.type,
      price: Number(values.price),
      cost: Number(values.cost || 0),
      deadline: values.deadline,
      status: values.status,
      paymentStatus: values.paymentStatus,
      description: values.description,
      notes: values.notes,
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
                      <Chip
                        label={project.status}
                        size="small"
                        color={getStatusChipColor(project.status)}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={project.paymentStatus}
                        size="small"
                        color={getPaymentChipColor(project.paymentStatus)}
                      />
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
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
            >
              <TextField
                select
                label="Client"
                required
                fullWidth
                value={formData.clientId}
                error={Boolean(formErrors.clientId)}
                helperText={formErrors.clientId}
                onChange={(event) => handleClientSelect(event.target.value)}
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
                fullWidth
                value={formData.dealId}
                error={Boolean(formErrors.dealId)}
                helperText={
                  formErrors.dealId ||
                  "Optional. Only Closed Won deals can be linked."
                }
                onChange={(event) => handleDealSelect(event.target.value)}
              >
                <MenuItem value="">No linked deal</MenuItem>

                {availableDeals.map((deal) => (
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
                error={Boolean(formErrors.name)}
                helperText={formErrors.name}
                onChange={(event) =>
                  updateFormField("name", event.target.value)
                }
              />

              <TextField
                select
                label="Project Type"
                fullWidth
                value={formData.type}
                error={Boolean(formErrors.type)}
                helperText={formErrors.type}
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
                  error={Boolean(formErrors.price)}
                  helperText={formErrors.price}
                  onChange={(event) =>
                    updateFormField("price", event.target.value)
                  }
                  slotProps={{
                    htmlInput: {
                      step: "0.01",
                      min: "0",
                    },
                  }}
                />

                <TextField
                  label="Cost"
                  type="number"
                  fullWidth
                  value={formData.cost}
                  error={Boolean(formErrors.cost)}
                  helperText={formErrors.cost}
                  onChange={(event) =>
                    updateFormField("cost", event.target.value)
                  }
                  slotProps={{
                    htmlInput: {
                      step: "0.01",
                      min: "0",
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
                  error={Boolean(formErrors.status)}
                  helperText={formErrors.status}
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
                  error={Boolean(formErrors.paymentStatus)}
                  helperText={formErrors.paymentStatus}
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
                error={Boolean(formErrors.deadline)}
                helperText={formErrors.deadline}
                onChange={(event) =>
                  updateFormField("deadline", event.target.value)
                }
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                  htmlInput: {
                    min: todayInputValue,
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