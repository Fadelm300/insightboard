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

function getProjectDealId(project: Project) {
  if (!project.dealId) return "";

  if (typeof project.dealId === "object") {
    return project.dealId._id;
  }

  return project.dealId;
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [formData, setFormData] = useState<DealFormData>(emptyForm);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [deleteDeal, setDeleteDeal] = useState<Deal | null>(null);

  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const convertedDealIds = useMemo(() => {
    return new Set(
      projects
        .map((project) => getProjectDealId(project))
        .filter((dealId) => Boolean(dealId))
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
      estimatedBudget: String(deal.estimatedBudget || ""),
      finalPrice: String(deal.finalPrice || ""),
      status: deal.status || "Lead",
      probability: String(deal.probability || 0),
      expectedCloseDate: getDateInputValue(deal.expectedCloseDate),
      description: deal.description || "",
      notes: deal.notes || "",
    });
    setOpenForm(true);
    setError("");
    setSuccess("");
  }

  function handleFormClose() {
    setOpenForm(false);
    setEditingDeal(null);
    setFormData(emptyForm);
  }

  function updateFormField<K extends keyof DealFormData>(
    field: K,
    value: DealFormData[K]
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData.clientId) {
      setError("Client is required");
      return;
    }

    if (!formData.title.trim()) {
      setError("Deal title is required");
      return;
    }

    if (!formData.estimatedBudget || Number(formData.estimatedBudget) <= 0) {
      setError("Estimated budget must be greater than 0");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      clientId: formData.clientId,
      title: formData.title,
      estimatedBudget: Number(formData.estimatedBudget),
      finalPrice: formData.finalPrice ? Number(formData.finalPrice) : 0,
      status: formData.status,
      probability: Number(formData.probability || 0),
      expectedCloseDate: formData.expectedCloseDate || undefined,
      description: formData.description,
      notes: formData.notes,
    };

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
      const message = err instanceof Error ? err.message : "Failed to save deal";
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
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Deals
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Track sales opportunities before they become projects.
          </Typography>
        </Box>

        <Button variant="contained" onClick={handleCreateOpen}>
          Add Deal
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
          ) : deals.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <Typography variant="h6">No deals yet</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Add your first deal to start tracking your sales pipeline.
              </Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Deal</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Budget</TableCell>
                  <TableCell>Final Price</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Probability</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {deals.map((deal) => {
                  const isConverted = convertedDealIds.has(deal._id);

                  return (
                    <TableRow key={deal._id} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600 }}>
                          {deal.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {deal.description || "No description"}
                        </Typography>
                      </TableCell>

                      <TableCell>{getClientName(deal.clientId)}</TableCell>

                      <TableCell>{deal.estimatedBudget} BHD</TableCell>

                      <TableCell>{deal.finalPrice || 0} BHD</TableCell>

                      <TableCell>
                        <Chip label={deal.status} size="small" />
                      </TableCell>

                      <TableCell>{deal.probability || 0}%</TableCell>

                      <TableCell align="right">
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          {deal.status === "Closed Won" && !isConverted && (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleConvertToProject(deal)}
                              disabled={saving}
                            >
                              Convert
                            </Button>
                          )}

                          {deal.status === "Closed Won" && isConverted && (
                            <Button size="small" variant="outlined" disabled>
                              Converted
                            </Button>
                          )}

                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleEditOpen(deal)}
                          >
                            Edit
                          </Button>

                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => setDeleteDeal(deal)}
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
          )}
        </CardContent>
      </Card>

      <Dialog open={openForm} onClose={handleFormClose} maxWidth="md" fullWidth>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editingDeal ? "Edit Deal" : "Add Deal"}</DialogTitle>

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
                />

                <TextField
                  label="Final Price"
                  type="number"
                  fullWidth
                  value={formData.finalPrice}
                  onChange={(event) =>
                    updateFormField("finalPrice", event.target.value)
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
                    updateFormField("status", event.target.value as DealStatus)
                  }
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
              {saving ? "Saving..." : editingDeal ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(deleteDeal)} onClose={() => setDeleteDeal(null)}>
        <DialogTitle>Delete Deal</DialogTitle>

        <DialogContent>
          <Typography>
            Are you sure you want to delete{" "}
            <strong>{deleteDeal?.title}</strong>?
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