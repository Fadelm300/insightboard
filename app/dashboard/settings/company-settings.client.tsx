"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { apiFetch } from "@/lib/apiClient";
import type { CompanySettings } from "@/lib/companySettings";

const endpoint = "/api/company-settings";

export default function CompanySettingsPanel({ editable }: { editable: boolean }) {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<{ data: CompanySettings }>(endpoint, { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setSettings(data); })
      .catch(() => { if (!controller.signal.aborted) setError("Unable to load company settings."); });
    return () => controller.abort();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editable || !settings || busy) return;
    setError("");
    setSaved(false);
    setBusy(true);
    try {
      const result = await apiFetch<{ data: CompanySettings }>(endpoint, {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setSettings(result.data);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save company settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack component="form" spacing={2} onSubmit={save}>
      <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 800 }}>Company settings</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {saved && <Alert severity="success">Company settings saved.</Alert>}
      {settings ? (
        <>
          <TextField label="Business Name" fullWidth required value={settings.name}
            disabled={!editable || busy}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
            onChange={(event) => { setSaved(false); setSettings({ ...settings, name: event.target.value }); }} />
          <TextField label="Company time zone" fullWidth required value={settings.timeZone}
            disabled={!editable || busy}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
            helperText="For example, Asia/Bahrain. Used for report generation timestamps."
            onChange={(event) => { setSaved(false); setSettings({ ...settings, timeZone: event.target.value }); }} />
          <Typography>Currency: Bahraini dinar (BHD)</Typography>
          {editable && <Button type="submit" variant="contained" disabled={busy} sx={{ alignSelf: "flex-start", borderRadius: 3 }}>Save company settings</Button>}
        </>
      ) : !error && <Typography>Loading company settings…</Typography>}
    </Stack>
  );
}
