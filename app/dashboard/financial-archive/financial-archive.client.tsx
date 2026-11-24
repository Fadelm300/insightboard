"use client";

import { useEffect, useState } from "react";
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Paper, Stack, Tab, Tabs, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from "@mui/material";
import { apiFetch } from "@/lib/apiClient";

type Resource = "revenue" | "expenses";
type ArchiveRow = { _id: string; projectId?: string; amount: number; deletedAt?: string };
type ArchivePage = { records: ArchiveRow[]; hasMore: boolean };
const amounts = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

export default function FinancialArchiveClient({ canRestore }: { canRestore: boolean }) {
  const [resource, setResource] = useState<Resource>("revenue");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: ArchivePage; error?: string }>();
  const [selection, setSelection] = useState<ArchiveRow>();
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<{ severity: "success" | "error"; text: string }>();
  const key = `${resource}:${page}:${refresh}`;
  const current = result?.key === key ? result : undefined;

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<{ data: ArchivePage }>(`/api/financial-archive/${resource}?page=${page}`, {
      signal: controller.signal,
    }).then(({ data }) => {
      if (!controller.signal.aborted) setResult({ key, data });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setResult({ key, error: error instanceof Error ? error.message : "Unable to load the archive." });
    });
    return () => controller.abort();
  }, [key, page, resource]);

  async function restore() {
    if (!selection || restoring || !canRestore) return;
    setRestoring(true);
    setMessage(undefined);
    try {
      await apiFetch(`/api/financial-archive/${resource}/${selection._id}/restore`, { method: "POST" });
      setMessage({ severity: "success", text: "Record restored and included in financial totals." });
      if (page > 1 && current?.data?.records.length === 1) setPage(page - 1);
      setRefresh((value) => value + 1);
    } catch (error) {
      setMessage({ severity: "error", text: error instanceof Error ? error.message : "Unable to restore the record." });
      setRefresh((value) => value + 1);
    } finally {
      setRestoring(false);
      setSelection(undefined);
    }
  }

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h4" component="h1">Financial Archive</Typography>
        <Typography color="text.secondary">View archived revenue and expenses. Restored records return to financial totals.</Typography>
      </Box>
      <Tabs value={resource} aria-label="Archived record type" onChange={(_, value: Resource) => {
        setResource(value);
        setPage(1);
        setMessage(undefined);
      }}>
        <Tab label="Revenue" value="revenue" disabled={restoring} />
        <Tab label="Expenses" value="expenses" disabled={restoring} />
      </Tabs>
      {message && <Alert severity={message.severity}>{message.text}</Alert>}
      {!current && <Box role="status"><CircularProgress size={24} aria-label="Loading archive" /></Box>}
      {current?.error && <Alert severity="error" action={
        <Button color="inherit" onClick={() => setRefresh((value) => value + 1)}>Retry</Button>
      }>{current.error}</Alert>}
      {current?.data && (
        <>
          {current.data.records.length === 0 ? <Alert severity="info">No archived records on this page.</Alert> : (
            <TableContainer component={Paper}>
              <Table aria-label="Archived financial records">
                <TableHead>
                  <TableRow>
                    <TableCell>Record ID</TableCell><TableCell>Project ID</TableCell>
                    <TableCell align="right">Amount</TableCell><TableCell>Archived on</TableCell>
                    {canRestore && <TableCell align="right">Action</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {current.data.records.map((row) => (
                    <TableRow key={row._id}>
                      <TableCell>{row._id}</TableCell><TableCell>{row.projectId ?? "—"}</TableCell>
                      <TableCell align="right">{amounts.format(row.amount)}</TableCell>
                      <TableCell>{row.deletedAt ? new Date(row.deletedAt).toLocaleString() : "—"}</TableCell>
                      {canRestore && <TableCell align="right"><Button onClick={() => setSelection(row)}>Restore</Button></TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Button disabled={page === 1 || restoring} onClick={() => setPage(page - 1)}>Previous</Button>
            <Typography>Page {page}</Typography>
            <Button disabled={!current.data.hasMore || page >= 400 || restoring} onClick={() => setPage(page + 1)}>Next</Button>
          </Stack>
        </>
      )}
      <Dialog open={Boolean(selection)} onClose={restoring ? undefined : () => setSelection(undefined)} aria-labelledby="archive-restore-title">
        <DialogTitle id="archive-restore-title">Restore this record?</DialogTitle>
        <DialogContent>The record will return to the active list and be included in financial totals.</DialogContent>
        <DialogActions>
          <Button disabled={restoring} onClick={() => setSelection(undefined)}>Cancel</Button>
          <Button variant="contained" disabled={restoring} onClick={restore}>{restoring ? "Restoring…" : "Restore record"}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
