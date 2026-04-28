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
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import { apiFetch } from "@/lib/apiClient";

type ClientStatus =
  | "New Lead"
  | "Contacted"
  | "Interested"
  | "Not Interested"
  | "Converted";

type Client = {
  _id: string;
  companyName: string;
  businessType?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  location?: string;
  website?: string;
  description?: string;
  notes?: string;
  status: ClientStatus;
  createdAt?: string;
};

type ClientFormData = {
  companyName: string;
  businessType: string;
  contactPerson: string;
  phone: string;
  email: string;
  location: string;
  website: string;
  description: string;
  notes: string;
  status: ClientStatus;
};

type ClientsResponse = {
  success?: boolean;
  message?: string;
  data?: Client[] | { clients?: Client[] };
  clients?: Client[];
};

const CLIENT_STATUSES: ClientStatus[] = [
  "New Lead",
  "Contacted",
  "Interested",
  "Not Interested",
  "Converted",
];

const emptyForm: ClientFormData = {
  companyName: "",
  businessType: "",
  contactPerson: "",
  phone: "",
  email: "",
  location: "",
  website: "",
  description: "",
  notes: "",
  status: "New Lead",
};

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

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState<ClientFormData>(emptyForm);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);

  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchClients() {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch<ClientsResponse>("/api/clients");
      setClients(getClientsFromResponse(response));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load clients";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClients();
  }, []);

  function handleCreateOpen() {
    setEditingClient(null);
    setFormData(emptyForm);
    setOpenForm(true);
    setError("");
    setSuccess("");
  }

  function handleEditOpen(client: Client) {
    setEditingClient(client);
    setFormData({
      companyName: client.companyName || "",
      businessType: client.businessType || "",
      contactPerson: client.contactPerson || "",
      phone: client.phone || "",
      email: client.email || "",
      location: client.location || "",
      website: client.website || "",
      description: client.description || "",
      notes: client.notes || "",
      status: client.status || "New Lead",
    });
    setOpenForm(true);
    setError("");
    setSuccess("");
  }

  function handleFormClose() {
    setOpenForm(false);
    setEditingClient(null);
    setFormData(emptyForm);
  }

  function updateFormField<K extends keyof ClientFormData>(
    field: K,
    value: ClientFormData[K]
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData.companyName.trim()) {
      setError("Company name is required");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingClient) {
        await apiFetch(`/api/clients/${editingClient._id}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });

        setSuccess("Client updated successfully");
      } else {
        await apiFetch("/api/clients", {
          method: "POST",
          body: JSON.stringify(formData),
        });

        setSuccess("Client created successfully");
      }

      handleFormClose();
      await fetchClients();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save client";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteClient) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch(`/api/clients/${deleteClient._id}`, {
        method: "DELETE",
      });

      setSuccess("Client deleted successfully");
      setDeleteClient(null);
      await fetchClients();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete client";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{
            mb: 3,
            justifyContent: "space-between",
            alignItems: { xs: "stretch", sm: "center" },
          }}
        >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Clients
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Manage companies, leads, and customer information.
          </Typography>
        </Box>

        <Button variant="contained" onClick={handleCreateOpen}>
          Add Client
        </Button>
      </Stack>

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
          ) : clients.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <Typography variant="h6">No clients yet</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Add your first client to start building the CRM.
              </Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Company</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client._id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>
                        {client.companyName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {client.businessType || "No business type"}
                      </Typography>
                    </TableCell>

                    <TableCell>{client.contactPerson || "-"}</TableCell>
                    <TableCell>{client.email || "-"}</TableCell>
                    <TableCell>{client.phone || "-"}</TableCell>

                    <TableCell>
                      <Chip label={client.status} size="small" />
                    </TableCell>

                    <TableCell align="right">
                     <Stack
                            direction="row"
                            spacing={1}
                            sx={{ justifyContent: "flex-end" }}
                          >
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleEditOpen(client)}
                        >
                          Edit
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => setDeleteClient(client)}
                        >
                          Delete
                        </Button>
                      </Stack>
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
            {editingClient ? "Edit Client" : "Add Client"}
          </DialogTitle>

          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Company Name"
                required
                fullWidth
                value={formData.companyName}
                onChange={(event) =>
                  updateFormField("companyName", event.target.value)
                }
              />

              <TextField
                label="Business Type"
                fullWidth
                value={formData.businessType}
                onChange={(event) =>
                  updateFormField("businessType", event.target.value)
                }
              />

              <TextField
                label="Contact Person"
                fullWidth
                value={formData.contactPerson}
                onChange={(event) =>
                  updateFormField("contactPerson", event.target.value)
                }
              />

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Phone"
                  fullWidth
                  value={formData.phone}
                  onChange={(event) =>
                    updateFormField("phone", event.target.value)
                  }
                />

                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  value={formData.email}
                  onChange={(event) =>
                    updateFormField("email", event.target.value)
                  }
                />
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Location"
                  fullWidth
                  value={formData.location}
                  onChange={(event) =>
                    updateFormField("location", event.target.value)
                  }
                />

                <TextField
                  label="Website"
                  fullWidth
                  value={formData.website}
                  onChange={(event) =>
                    updateFormField("website", event.target.value)
                  }
                />
              </Stack>

              <TextField
                select
                label="Status"
                fullWidth
                value={formData.status}
                onChange={(event) =>
                  updateFormField("status", event.target.value as ClientStatus)
                }
              >
                {CLIENT_STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </TextField>

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
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleFormClose} disabled={saving}>
              Cancel
            </Button>

            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "Saving..." : editingClient ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(deleteClient)} onClose={() => setDeleteClient(null)}>
        <DialogTitle>Delete Client</DialogTitle>

        <DialogContent>
          <Typography>
            Are you sure you want to delete{" "}
            <strong>{deleteClient?.companyName}</strong>?
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteClient(null)} disabled={saving}>
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