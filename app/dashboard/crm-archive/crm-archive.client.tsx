"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { apiFetch } from "@/lib/apiClient";

type Resource = "clients" | "deals" | "projects";
type ArchiveRow = {
  _id: string;
  label?: string;
  clientId?: string;
  dealId?: string;
};
type ArchivePage = {
  records: ArchiveRow[];
  hasMore: boolean;
};
type Selection = {
  resource: Resource;
  row: ArchiveRow;
};

const labels: Record<Resource, string> = {
  clients: "Client",
  deals: "Deal",
  projects: "Project",
};

export default function CrmArchiveClient({ canRestore }: { canRestore: boolean }) {
  const [resource, setResource] = useState<Resource>("clients");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: ArchivePage;
    error?: string;
  }>();
  const [selection, setSelection] = useState<Selection>();
  const [restoring, setRestoring] = useState(false);
  const inFlight = useRef(false);
  const [message, setMessage] = useState<{
    severity: "success" | "error";
    text: string;
  }>();

  const key = `${resource}:${page}:${refresh}`;
  const current = result?.key === key ? result : undefined;

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<{ data: ArchivePage }>(
      `/api/crm-archive/${resource}?page=${page}`,
      {
        signal: controller.signal,
      },
    )
      .then(({ data }) => {
        if (!controller.signal.aborted) setResult({ key, data });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load the archive.",
          });
      });

    return () => controller.abort();
  }, [key, page, resource]);

  async function restore() {
    if (!selection || inFlight.current || !canRestore) return;

    inFlight.current = true;
    setRestoring(true);
    setMessage(undefined);

    try {
      await apiFetch(
        `/api/crm-archive/${selection.resource}/${selection.row._id}/restore`,
        { method: "POST" },
      );
      setMessage({
        severity: "success",
        text: `${labels[selection.resource]} “${selection.row.label || "Unnamed record"}” restored to the active list.`,
      });

      if (page > 1 && current?.data?.records.length === 1) setPage(page - 1);
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Unable to restore the record.";

      setMessage({
        severity: "error",
        text:
          text === "Linked client or Closed Won deal is unavailable"
            ? "Restore the linked client first. For a linked project, restore its Closed Won deal for the same client before restoring the project."
            : text === "Archived record not found"
              ? "This record is no longer in the archive. Check the active list; it may have already been restored."
              : text,
      });
    } finally {
      inFlight.current = false;
      setRestoring(false);
      setSelection(undefined);
      setRefresh((value) => value + 1);
    }
  }

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Box>
        <Typography variant="h4" component="h1">CRM Archive</Typography>
        <Typography color="text.secondary">Archived clients, deals, and projects. Restore records to return them to their active lists.</Typography>
      </Box>

      <Alert severity="info">Restore in this order: client, then deal, then project. A linked project requires an active Closed Won deal for the same client.</Alert>

      <Tabs
        value={resource}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="CRM archive record type"
        onChange={(_, value: Resource) => {
          setResource(value);
          setPage(1);
          setSelection(undefined);
          setMessage(undefined);
        }}
      >
        <Tab label="Clients" value="clients" disabled={restoring} />
        <Tab label="Deals" value="deals" disabled={restoring} />
        <Tab label="Projects" value="projects" disabled={restoring} />
      </Tabs>

      {message && <Alert severity={message.severity}>{message.text}</Alert>}

      {!current && (
        <Stack role="status" aria-label="Loading CRM archive" spacing={1}>
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} variant="rounded" height={96} />
          ))}
        </Stack>
      )}

      {current?.error && (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              onClick={() => setRefresh((value) => value + 1)}
            >
              Retry
            </Button>
          }
        >
          {current.error}
        </Alert>
      )}

      {current?.data && (
        <>
          {current.data.records.length === 0 ? (
            <Alert severity="info">No archived {resource} on this page.</Alert>
          ) : (
            <Stack
              spacing={1.5}
              component="ul"
              aria-label={`Archived ${resource}`}
              sx={{ listStyle: "none", p: 0, m: 0 }}
            >
              {current.data.records.map((row) => (
                <Paper
                  component="li"
                  variant="outlined"
                  key={row._id}
                  sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3 }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{
                      justifyContent: "space-between",
                      alignItems: { sm: "center" },
                    }}
                  >
                    <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
                      <Typography variant="caption" color="text.secondary">Archived {labels[resource].toLowerCase()}</Typography>
                      <Typography sx={{ fontWeight: 700 }}>
                        {row.label || "Unnamed record"}
                      </Typography>

                      <Box component="details" sx={{ mt: 1 }}>
                        <Box
                          component="summary"
                          sx={{
                            cursor: "pointer",
                            color: "text.secondary",
                            fontSize: 13,
                          }}
                        >
                          Record reference
                        </Box>
                        <Typography
                          variant="caption"
                          component="div"
                          dir="ltr"
                          sx={{ mt: 0.5, overflowWrap: "anywhere" }}
                        >
                          ID: {row._id}
                        </Typography>
                        {row.clientId && (
                          <Typography
                            variant="caption"
                            component="div"
                            dir="ltr"
                            sx={{ overflowWrap: "anywhere" }}
                          >
                            Client ID: {row.clientId}
                          </Typography>
                        )}
                        {row.dealId && (
                          <Typography
                            variant="caption"
                            component="div"
                            dir="ltr"
                            sx={{ overflowWrap: "anywhere" }}
                          >
                            Deal ID: {row.dealId}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {canRestore && (
                      <Button
                        variant="outlined"
                        disabled={restoring}
                        aria-label={`Restore ${row.label || labels[resource]}`}
                        onClick={() => setSelection({ resource, row })}
                        sx={{ flexShrink: 0 }}
                      >
                        Restore
                      </Button>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}

          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Button
              disabled={page === 1 || restoring}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Typography aria-live="polite">Page {page}</Typography>
            <Button
              disabled={!current.data.hasMore || page >= 400 || restoring}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </Stack>
        </>
      )}

      <Dialog
        open={Boolean(selection)}
        onClose={restoring ? undefined : () => setSelection(undefined)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="crm-restore-title"
        aria-describedby="crm-restore-description"
      >
        <DialogTitle id="crm-restore-title">Restore {selection ? labels[selection.resource].toLowerCase() : "record"}?</DialogTitle>
        <DialogContent
          id="crm-restore-description"
          sx={{ overflowWrap: "anywhere" }}
        >
          <Typography sx={{ fontWeight: 700, mb: 1 }}>
            {selection?.row.label || "Unnamed record"}
          </Typography>
          <Typography>The record will return to its active list. Related records will not be restored automatically.</Typography>
          {selection?.resource !== "clients" && (
            <Typography sx={{ mt: 1 }}>The linked client must be active. A linked project also needs its Closed Won deal for the same client.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            disabled={restoring}
            onClick={() => setSelection(undefined)}
          >
            Cancel
          </Button>
          <Button variant="contained" disabled={restoring} onClick={restore}>
            {restoring ? "Restoring…" : "Restore record"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
