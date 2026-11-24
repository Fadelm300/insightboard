"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Skeleton,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { apiFetch } from "@/lib/apiClient";

type ArchiveRequestRow = {
  id: string;
  resource: string;
  recordId: string;
  label: string;
  reason: string;
  status: string;
  own: boolean;
  requesterId: string;
  requesterName: string;
  decidedByName: string | null;
  createdAt: string;
  expiresAt: string;
  decidedAt: string | null;
  decisionReason: string | null;
};
type Decision = "approve" | "reject" | "cancel";

export default function ArchiveRequestsClient({ canReview, readOnly }: {
  canReview: boolean;
  readOnly: boolean
}) {
  const [rows, setRows] = useState<ArchiveRequestRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selection, setSelection] = useState<{
    row: ArchiveRequestRow;
    action: Decision
  } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);

  const load = useCallback(async (signal: AbortSignal) => {
    const version = ++sequence.current;
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<{
        data: {
          records: ArchiveRequestRow[];
          hasMore: boolean
        }
      }>(
        `/api/archive-requests?page=${page}`,
        { signal }
      );
      if (signal.aborted || version !== sequence.current) return;
      setRows(response.data.records);
      setHasMore(response.data.hasMore);
    } catch (error) {
      if (!signal.aborted && version === sequence.current)
        setError(error instanceof Error ? error.message : "Unable to load requests");
    } finally {
      if (!signal.aborted && version === sequence.current) setLoading(false);
    }
  }, [page]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void load(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  function choose(row: ArchiveRequestRow, action: Decision, trigger: HTMLButtonElement) {
    trigger.blur();
    setSelection({ row, action });
    setReason("");
    setError("");
    setSuccess("");
  }
  async function decide() {
    if (!selection || busy || reason.trim().length < 5) return;
    setBusy(true);
    setError("");
    try {
      const response = await apiFetch<{ message: string }>(`/api/archive-requests/${selection.row.id}/decision`, {
        method: "POST",
        body: JSON.stringify({ action: selection.action, reason: reason.trim() }),
      });
      setSelection(null);
      setSuccess(response.message);
      await load(new AbortController().signal);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save decision");
    }
    finally {
      setBusy(false);
    }
  }

  return <Box>
    <Typography component="h1" variant="h4">Archive requests</Typography>
    <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>Track your requests and review requests assigned to your team. Approval archives the record; it does not permanently delete it.</Typography>
    <Alert severity="info" sx={{ mb: 2 }}>Another authorized person must approve. Requests expire after 7 days. Record changes and active relationships can block approval.</Alert>
    {error && !selection && <Alert severity="error" sx={{ mb: 2 }}>
      {error}
    </Alert>}
    {success && <Alert severity="success" sx={{ mb: 2 }}>
      {success}
    </Alert>}
    {loading ? <Stack spacing={2}>
      {[1, 2, 3].map((key) => <Skeleton key={key} variant="rounded" height={150} />)}
    </Stack> :
      <Stack spacing={2}>
        {rows.map((row) => <Card variant="outlined" key={row.id}>
          <CardContent>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between" }}>
              <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
                <Typography variant="overline">{row.resource} · {row.own ? "Your request" : "Team request"}</Typography>
                <Typography variant="h6">
                  {row.label}
                </Typography>
                <Typography sx={{ whiteSpace: "pre-wrap" }}>
                  {row.reason}
                </Typography>
                <Typography variant="body2" color="text.secondary">Requested by {row.requesterName}</Typography>
                <Typography variant="body2" color="text.secondary">Submitted {new Date(row.createdAt).toLocaleString("en-GB")} · Expires {new Date(row.expiresAt).toLocaleString("en-GB")}</Typography>
                {row.decisionReason
                  && <Box sx={{ mt: 1 }}>
                    <Typography variant="body2">Decision by {row.decidedByName ?? "Account"}{row.decidedAt ? ` · ${new Date(row.decidedAt).toLocaleString("en-GB")}` : ""}</Typography>
                    <Typography variant="body2">Reason: {row.decisionReason}</Typography>
                  </Box>}
                <Box component="details" sx={{ mt: 1 }}>
                  <Box component="summary" sx={{ cursor: "pointer" }}>References</Box>
                  <Typography variant="caption" component="p">Request: {row.id}</Typography>
                  <Typography variant="caption" component="p">Record: {row.recordId}</Typography>
                </Box>
              </Box>
              <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
                <Chip
                  label={row.status}
                  size="small"
                  color={row.status === "approved" ? "success" : row.status === "pending" ? "warning" : "default"}
                />
                {row.status === "pending" && !readOnly && (row.own ?
                  <Button onClick={(event) => choose(row, "cancel", event.currentTarget)}>Cancel request</Button> : canReview && <>
                    <Button variant="contained" onClick={(event) => choose(row, "approve", event.currentTarget)}>Approve archive</Button>
                    <Button color="error" onClick={(event) => choose(row, "reject", event.currentTarget)}>Reject request</Button>
                  </>)}
              </Stack>
            </Stack>
          </CardContent>
        </Card>)}
        {!rows.length && <Alert severity="info">No archive requests available.</Alert>}
      </Stack>}
    <Stack direction="row" spacing={2} sx={{ mt: 2, alignItems: "center" }}>
      <Button disabled={loading || page === 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
      <Typography>Page {page}</Typography>
      <Button disabled={loading || !hasMore} onClick={() => setPage((value) => value + 1)}>Next</Button>
      <Button disabled={loading} onClick={() => void load(new AbortController().signal)}>Refresh</Button>
    </Stack>
    <Dialog
      open={Boolean(selection)}
      onClose={() => {
        if (!busy) setSelection(null);
      }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        {selection?.action === "approve"
          ? "Approve and archive record?"
          : selection?.action === "reject" ? "Reject request?" : "Cancel your request?"}
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          {selection?.row.label}
        </Typography>
        {selection?.action === "approve"
          && <Alert severity="warning" sx={{ mb: 2 }}>This archives the current record and removes it from active lists. Archived financial records stop contributing to totals. Related records are not archived automatically.</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>}
        <TextField
          autoFocus
          label="Decision reason"
          fullWidth
          multiline
          minRows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          slotProps={{ htmlInput: { maxLength: 500 } }}
          helperText="5-500 characters"
        />
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={() => setSelection(null)}>Back</Button>
        <Button
          variant="contained"
          disabled={busy || reason.trim().length < 5 || reason.trim().length > 500}
          onClick={() => void decide()}
        >
          {busy ? "Saving..." : "Confirm decision"}
        </Button>
      </DialogActions>
    </Dialog>
  </Box>;
}
