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
  updatedAt?: string;
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

const PAYMENT_STATUSES: PaymentStatus[] = ["Unpaid", "Partially Paid", "Paid"];

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

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

function getDeadlineTime(deadline?: string) {
  if (!deadline) return Number.POSITIVE_INFINITY;

  const time = new Date(deadline).getTime();

  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
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
    name: cleanSingleLineText(formData.name),
    type: formData.type,
    price: formData.price.trim(),
    cost: formData.cost.trim() || "0",
    deadline: formData.deadline.trim(),
    status: formData.status,
    paymentStatus: formData.paymentStatus,
    description: cleanMultiLineText(formData.description),
    notes: cleanMultiLineText(formData.notes),
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

function getProjectStatusChipSx(status: ProjectStatus): SxProps<Theme> {
  const statusColors: Record<ProjectStatus, string> = {
    "Not Started": "#64748B",
    "In Progress": "#0EA5E9",
    Review: "#F59E0B",
    Completed: "#10B981",
    Cancelled: "#EF4444",
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

function getPaymentStatusChipSx(status: PaymentStatus): SxProps<Theme> {
  const statusColors: Record<PaymentStatus, string> = {
    Unpaid: "#64748B",
    "Partially Paid": "#F59E0B",
    Paid: "#10B981",
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

function getProjectInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "P";
}

function formatBHD(value?: number) {
  return `${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} BHD`;
}

function getProfitSx(profit: number): SxProps<Theme> {
  return {
    fontWeight: 900,
    color: profit >= 0 ? "success.main" : "error.main",
  };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);

  const [formData, setFormData] = useState<ProjectFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<ProjectFormErrors>({});
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [viewProject, setViewProject] = useState<Project | null>(null);
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const [actionProject, setActionProject] = useState<Project | null>(null);

  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const todayInputValue = getTodayInputValue();

  const sortedProjects = useMemo(() => {
    return [...projects].sort((firstProject, secondProject) => {
      const deadlineDifference =
        getDeadlineTime(firstProject.deadline) -
        getDeadlineTime(secondProject.deadline);

      if (deadlineDifference !== 0) {
        return deadlineDifference;
      }

      return (
        getCreatedAtTime(secondProject.createdAt) -
        getCreatedAtTime(firstProject.createdAt)
      );
    });
  }, [projects]);

  const availableDeals = useMemo(() => {
    return deals.filter((deal) => {
      const isClosedWon = deal.status === "Closed Won";
      const isSelectedDeal = deal._id === formData.dealId;
      const dealClientId = getId(deal.clientId);
      const belongsToSelectedClient =
        !formData.clientId ||
        !dealClientId ||
        dealClientId === formData.clientId;

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
    if (saving) return;

    setOpenForm(false);
    setEditingProject(null);
    setFormData(emptyForm);
    setFormErrors({});
  }

  function updateFormField<K extends keyof ProjectFormData>(
    field: K,
    value: ProjectFormData[K],
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

  function handleActionMenuOpen(
    event: React.MouseEvent<HTMLElement>,
    project: Project,
  ) {
    setActionAnchorEl(event.currentTarget);
    setActionProject(project);
  }

  function handleActionMenuClose() {
    setActionAnchorEl(null);
    setActionProject(null);
  }

  function handleMenuEdit() {
    if (!actionProject) return;

    const selectedProject = actionProject;
    handleActionMenuClose();
    handleEditOpen(selectedProject);
  }

  function handleMenuDelete() {
    if (!actionProject) return;

    const selectedProject = actionProject;
    handleActionMenuClose();
    setDeleteProject(selectedProject);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              letterSpacing: "-0.04em",
            }}
          >
            Projects
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Manage active website projects, costs, profit, and delivery status.
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
          ) : projects.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8, px: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                No projects yet
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Convert a closed deal or add a project manually.
              </Typography>

              <Button
                variant="contained"
                onClick={handleCreateOpen}
                sx={{ mt: 3, borderRadius: 2, fontWeight: 800 }}
              >
                Add Project
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
                    <TableCell align="center">Project</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Deal</TableCell>
                    <TableCell>Deadline</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Cost</TableCell>
                    <TableCell>Profit</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Payment</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {sortedProjects.map((project) => (
                    <TableRow
                      key={project._id}
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
                            {getProjectInitial(project.name)}
                          </Box>

                          <Box>
                            <Typography sx={{ fontWeight: 800 }}>
                              {project.name}
                            </Typography>

                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.25 }}
                            >
                              {project.type}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell>{getClientName(project.clientId)}</TableCell>
                      <TableCell>{getDealName(project.dealId)}</TableCell>

                      <TableCell sx={{ minWidth: 140, fontWeight: 800 }}>
                        {formatDate(project.deadline)}
                      </TableCell>

                      <TableCell sx={{ fontWeight: 700 }}>
                        {formatBHD(project.price)}
                      </TableCell>

                      <TableCell sx={{ fontWeight: 700 }}>
                        {formatBHD(project.cost)}
                      </TableCell>

                      <TableCell sx={getProfitSx(project.profit)}>
                        {formatBHD(project.profit)}
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={project.status}
                          size="small"
                          sx={getProjectStatusChipSx(project.status)}
                        />
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={project.paymentStatus}
                          size="small"
                          sx={getPaymentStatusChipSx(project.paymentStatus)}
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
                            onClick={() => setViewProject(project)}
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
                              handleActionMenuOpen(event, project)
                            }
                            aria-label={`Open actions for ${project.name}`}
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
                  ))}
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
        open={Boolean(viewProject)}
        onClose={() => setViewProject(null)}
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
          Project Details
        </DialogTitle>

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
                label="Project Name"
                fullWidth
                value={viewProject?.name || "-"}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="Project Type"
                fullWidth
                value={viewProject?.type || "-"}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
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
                label="Client"
                fullWidth
                value={viewProject ? getClientName(viewProject.clientId) : "-"}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="Deal"
                fullWidth
                value={viewProject ? getDealName(viewProject.dealId) : "-"}
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
                label="Price"
                fullWidth
                value={formatBHD(viewProject?.price)}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="Cost"
                fullWidth
                value={formatBHD(viewProject?.cost)}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="Profit"
                fullWidth
                value={formatBHD(viewProject?.profit)}
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
                label="Deadline"
                fullWidth
                value={formatDate(viewProject?.deadline)}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="Status"
                fullWidth
                value={viewProject?.status || "-"}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="Payment Status"
                fullWidth
                value={viewProject?.paymentStatus || "-"}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />
            </Box>

            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={3}
              value={viewProject?.description || "-"}
              sx={readonlyMultilineTextFieldSx}
              slotProps={{ input: { readOnly: true } }}
            />

            <TextField
              label="Notes"
              fullWidth
              multiline
              minRows={3}
              value={viewProject?.notes || "-"}
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
                value={formatDate(viewProject?.createdAt)}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />

              <TextField
                label="Updated At"
                fullWidth
                value={formatDate(viewProject?.updatedAt)}
                sx={readonlyTextFieldSx}
                slotProps={{ input: { readOnly: true } }}
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="contained" onClick={() => setViewProject(null)}>
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
          <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>
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
                      event.target.value as ProjectStatus,
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
                      event.target.value as PaymentStatus,
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
                helperText={
                  formErrors.deadline || "Choose today or a future date"
                }
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
        onClose={() => {
          if (!saving) setDeleteProject(null);
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
        <DialogTitle sx={{ fontWeight: 900 }}>Delete Project</DialogTitle>

        <DialogContent>
          <Typography color="text.secondary">
            Are you sure you want to delete{" "}
            <Box
              component="span"
              sx={{ color: "text.primary", fontWeight: 900 }}
            >
              {deleteProject?.name}
            </Box>
            ?
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