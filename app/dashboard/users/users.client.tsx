"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, Switch,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { apiFetch } from "@/lib/apiClient";
import { manageableRoles, permissionCeiling, withPermissionDependencies, type Permission } from "@/lib/permissions";

type ManagedUser = {
  id: string; name: string; email: string; role: string;
  isActive: boolean; allowedPermissions: Permission[];
  managedBy: string | null; version: number;
};
type UserForm = {
  name: string; email: string; role: string; isActive: boolean;
  allowedPermissions: Permission[]; password: string;
  managerId?: string | null;
};
const emptyForm = (): UserForm => ({
  name: "", email: "", role: "employee", isActive: true,
  allowedPermissions: ["settings.read"], password: "",
});
const readableRoles: Record<string, string> = {
  manager: "Manager", senior: "Senior employee", employee: "Employee", viewer: "Viewer",
};

export default function UsersClient({ actorRole, actorPermissions }: {
  actorRole: string; actorPermissions: Permission[];
}) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [managers, setManagers] = useState<ManagedUser[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canManage = actorPermissions.includes("users.manage");
  const roles = manageableRoles(actorRole);
  const options = permissionCeiling(form.role).filter((permission) =>
    actorPermissions.includes(permission),
  );
  const resources = [...new Set(options.map((permission) => permission.split(".")[0]))];

  const loadUsers = useCallback(async () => {
    const response = await apiFetch<{ data: { users: ManagedUser[] } }>(`/api/users?page=${page}`);
    return response.data.users;
  }, [page]);

  useEffect(() => {
    let active = true;
    void loadUsers()
      .then((records) => {
        if (active) { setUsers(records); setError(""); }
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load users");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadUsers]);
  useEffect(() => {
    if (actorRole !== "admin" || !canManage) return;
    let active = true;
    void apiFetch<{ data: { users: ManagedUser[] } }>("/api/users?role=manager")
      .then((response) => { if (active) setManagers(response.data.users.filter((user) => user.isActive)); })
      .catch(() => { if (active) setManagers([]); });
    return () => { active = false; };
  }, [actorRole, canManage]);

  function edit(user: ManagedUser | null) {
    setEditing(user);
    setForm(user ? { ...user, managerId: user.managedBy, password: "" } : {
      ...emptyForm(), allowedPermissions: actorPermissions.includes("settings.read") ? ["settings.read"] : [],
    });
    setError("");
    setSuccess("");
    setOpen(true);
  }

  function setRole(role: string) {
    const ceiling = permissionCeiling(role);
    setForm((current) => ({
      ...current, role,
      allowedPermissions: role === "manager" ? ceiling.filter((permission) => actorPermissions.includes(permission))
        : current.allowedPermissions.filter((permission) => ceiling.includes(permission)),
    }));
  }

  function togglePermission(permission: Permission, checked: boolean) {
    setForm((current) => ({
      ...current,
      allowedPermissions: checked
        ? withPermissionDependencies([...current.allowedPermissions, permission])
        : current.allowedPermissions.filter((grant) => !withPermissionDependencies([grant]).includes(permission)),
    }));
  }

  async function save() {
    if (!canManage || saving) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name, role: form.role, isActive: form.isActive,
        allowedPermissions: form.allowedPermissions,
        ...(!editing ? { email: form.email } : {}),
        ...(editing ? { version: editing.version } : {}),
        ...(actorRole === "admin" && form.managerId !== undefined ? { managerId: form.managerId } : {}),
        ...(form.password ? { password: form.password } : {}),
      };
      await apiFetch(editing ? `/api/users/${editing.id}` : "/api/users", {
        method: editing ? "PUT" : "POST", body: JSON.stringify(payload),
      });
      setOpen(false);
      setForm(emptyForm());
      setSuccess(editing ? "Account updated. Existing sessions were revoked." : "Account created.");
      setLoading(true);
      setUsers(await loadUsers());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save user");
    } finally {
      setSaving(false);
      setLoading(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
        <Box>
          <Typography component="h1" variant="h4">Users and permissions</Typography>
          <Typography color="text.secondary">Individual accounts for one company. Select the sections and actions each person may use.</Typography>
        </Box>
        {canManage && <Button variant="contained" onClick={() => edit(null)}>Add user</Button>}
      </Box>
      {error && !open && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      <Alert severity="info">Managers can manage the employee accounts they create. Reserved and existing admin accounts are not editable here. Employee deletion approvals are a separate upcoming workflow.</Alert>
      {loading ? <CircularProgress aria-label="Loading users" /> : (
        <Box sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead><TableRow>{["Name", "Email", "Role", "Status", "Actions"].map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {users.map((user) => <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell><TableCell>{user.email}</TableCell>
                <TableCell>{readableRoles[user.role] ?? user.role}</TableCell>
                <TableCell>{user.isActive ? "Active" : "Disabled"}</TableCell>
                <TableCell>{canManage && <Button onClick={() => edit(user)}>Edit permissions</Button>}</TableCell>
              </TableRow>)}
              {!users.length && <TableRow><TableCell colSpan={5}>No manageable accounts on this page.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Box>
      )}
      <Stack direction="row" spacing={1}>
        <Button disabled={loading || page === 1} onClick={() => { setLoading(true); setPage((value) => value - 1); }}>Previous</Button>
        <Button disabled={loading || users.length < 50} onClick={() => { setLoading(true); setPage((value) => value + 1); }}>Next</Button>
      </Stack>
      <Dialog open={open} onClose={() => { if (!saving) { setOpen(false); setForm(emptyForm()); } }} fullWidth maxWidth="md">
        <DialogTitle>{editing ? "Edit account" : "Create account"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            <TextField label="Email" type="email" value={form.email} disabled={!!editing} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            <TextField label={editing ? "New password (leave blank to keep)" : "Initial password"} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} helperText="At least 12 characters; maximum 72 UTF-8 bytes. Share credentials through your approved private channel." />
            <TextField select label="Role" value={form.role} onChange={(event) => setRole(event.target.value)}>
              {roles.map((role) => <MenuItem key={role} value={role}>{readableRoles[role]}</MenuItem>)}
            </TextField>
            {actorRole === "admin" && form.role !== "manager" && <TextField select label="Team manager" value={form.managerId ?? ""}
              onChange={(event) => setForm({ ...form, managerId: event.target.value || null })}>
              <MenuItem value="">Not assigned to a manager</MenuItem>
              {managers.map((manager) => <MenuItem key={manager.id} value={manager.id}>{manager.name}</MenuItem>)}
            </TextField>}
            <FormControlLabel control={<Switch checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />} label="Account active" />
            <Typography variant="body2" color="text.secondary">Selecting an action also selects its required read permissions. Reports and overview need the underlying data sections. Related selectors expose only minimal names and IDs. Print and export permissions are independent.</Typography>
            {resources.map((resource) => <Box key={resource} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1.5 }}>
              <Typography variant="subtitle2">{resource}</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap" }}>
                {options.filter((permission) => permission.startsWith(resource + ".")).map((permission) => <FormControlLabel key={permission}
                  control={<Checkbox checked={form.allowedPermissions.includes(permission)} onChange={(event) => togglePermission(permission, event.target.checked)} />}
                  label={permission === "projects.financial.read" ? "View project financial details" : permission === "projects.financial.manage" ? "Set and update project financial details" : permission.slice(resource.length + 1)} />)}
              </Box>
            </Box>)}
          </Stack>
        </DialogContent>
        <DialogActions><Button disabled={saving} onClick={() => { setOpen(false); setForm(emptyForm()); }}>Cancel</Button><Button disabled={saving || !canManage} onClick={() => void save()} variant="contained">{saving ? "Saving..." : "Save account"}</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}
