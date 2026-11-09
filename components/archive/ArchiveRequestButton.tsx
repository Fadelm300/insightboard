"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography
} from "@mui/material";
import { usePermission } from "@/components/access/PermissionProvider";
import { apiFetch } from "@/lib/apiClient";
import type { ArchiveResource } from "@/lib/archiveApprovalPolicy";
import type { Permission } from "@/lib/permissions";

export default function ArchiveRequestButton({ resource, recordId, label }: {
  resource: ArchiveResource;
  recordId: string;
  label: string;
}) {
  const canCreate = usePermission("archiveRequests.create");
  const canRead = usePermission(`${resource}.read` as Permission);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  if (!canCreate || !canRead) return null;

  async function submit() {
    if (busy || reason.trim().length < 5) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch(
        "/api/archive-requests",
        {
          method: "POST",
          body: JSON.stringify({ resource, recordId, reason: reason.trim() })
        }
      );
      setSent(true);
      setOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to submit request");
    }
    finally {
      setBusy(false);
    }
  }

  return <>
    <Button
      size="small"
      disabled={sent}
      onClick={(event) => {
        event.currentTarget.blur();
        setOpen(true);
      }}
    >
      {sent ? "Request submitted" : "Request archive"}
    </Button>
    <Dialog open={open} onClose={() => {
      if (!busy) setOpen(false);
    }} fullWidth maxWidth="sm">
      <DialogTitle>Request archive</DialogTitle>
      <DialogContent sx={{ overflowY: "auto" }}>
        <Typography sx={{ mb: 2 }}>
          {label}
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>This sends a request for review. The record remains active until another authorized person approves it.</Alert>
        {error && <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>}
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          label="Reason for archiving"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          slotProps={{ htmlInput: { maxLength: 500 } }}
          helperText="5-500 characters"
        />
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
        <Button
          variant="contained"
          disabled={busy || reason.trim().length < 5 || reason.trim().length > 500}
          onClick={() => void submit()}
        >
          {busy ? "Submitting..." : "Submit request"}
        </Button>
      </DialogActions>
    </Dialog>
  </>;
}
