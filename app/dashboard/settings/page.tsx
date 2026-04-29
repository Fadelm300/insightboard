"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { apiFetch, removeToken } from "@/lib/apiClient";

type User = {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type MeResponse = {
  success?: boolean;
  message?: string;
  data?: {
    user?: User;
  };
  user?: User;
};

const BUSINESS_NAME_KEY = "insightboard_business_name";
const CURRENCY_KEY = "insightboard_currency";
const THEME_MODE_KEY = "insightboard_theme_mode";

const DEFAULT_BUSINESS_NAME = "InsightBoard CRM";
const DEFAULT_CURRENCY = "BHD";
const DEFAULT_THEME_MODE = "Light";

function getUserFromResponse(response: MeResponse): User | null {
  if (response.data?.user) return response.data.user;
  if (response.user) return response.user;
  return null;
}

export default function SettingsPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [businessName, setBusinessName] = useState(DEFAULT_BUSINESS_NAME);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [themeMode, setThemeMode] = useState(DEFAULT_THEME_MODE);

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchUser() {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch<MeResponse>("/api/auth/me");
      setUser(getUserFromResponse(response));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load user";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function loadPreferences() {
    if (typeof window === "undefined") return;

    const savedBusinessName = localStorage.getItem(BUSINESS_NAME_KEY);
    const savedCurrency = localStorage.getItem(CURRENCY_KEY);
    const savedThemeMode = localStorage.getItem(THEME_MODE_KEY);

    if (savedBusinessName) setBusinessName(savedBusinessName);
    if (savedCurrency) setCurrency(savedCurrency);
    if (savedThemeMode) setThemeMode(savedThemeMode);
  }

  function handleSavePreferences() {
    setSavingPreferences(true);
    setError("");
    setSuccess("");

    try {
      localStorage.setItem(
        BUSINESS_NAME_KEY,
        businessName.trim() || DEFAULT_BUSINESS_NAME
      );
      localStorage.setItem(CURRENCY_KEY, currency);
      localStorage.setItem(THEME_MODE_KEY, themeMode);

      setSuccess("Settings saved successfully");
    } catch {
      setError("Failed to save settings");
    } finally {
      setSavingPreferences(false);
    }
  }

  function handleResetPreferences() {
    localStorage.removeItem(BUSINESS_NAME_KEY);
    localStorage.removeItem(CURRENCY_KEY);
    localStorage.removeItem(THEME_MODE_KEY);

    setBusinessName(DEFAULT_BUSINESS_NAME);
    setCurrency(DEFAULT_CURRENCY);
    setThemeMode(DEFAULT_THEME_MODE);
    setSuccess("Settings reset successfully");
    setError("");
  }

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch {
      // frontend logout should still continue
    }

    removeToken();
    router.replace("/login");
  }

  useEffect(() => {
    loadPreferences();
    fetchUser();
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Settings
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Manage account information and dashboard preferences.
        </Typography>
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

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
        }}
      >
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Account
            </Typography>

            <Stack spacing={2}>
              <TextField
                label="Name"
                value={user?.name || "Admin User"}
                fullWidth
                disabled
              />

              <TextField
                label="Email"
                value={user?.email || ""}
                fullWidth
                disabled
              />

              <TextField
                label="Role"
                value={user?.role || "admin"}
                fullWidth
                disabled
              />
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Button
              variant="contained"
              color="error"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </Button>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Dashboard Preferences
            </Typography>

            <Stack spacing={2}>
              <TextField
                label="Business Name"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                fullWidth
              />

              <TextField
                select
                label="Currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                fullWidth
              >
                <MenuItem value="BHD">BHD</MenuItem>
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="SAR">SAR</MenuItem>
                <MenuItem value="AED">AED</MenuItem>
              </TextField>

              <TextField
                select
                label="Theme Mode"
                value={themeMode}
                onChange={(event) => setThemeMode(event.target.value)}
                fullWidth
              >
                <MenuItem value="Light">Light</MenuItem>
                <MenuItem value="Dark">Dark</MenuItem>
                <MenuItem value="System">System</MenuItem>
              </TextField>

              <Alert severity="info">
                These preferences are saved in localStorage for now. Backend
                storage can be added later.
              </Alert>

              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  variant="contained"
                  onClick={handleSavePreferences}
                  disabled={savingPreferences}
                >
                  {savingPreferences ? "Saving..." : "Save Settings"}
                </Button>

                <Button variant="outlined" onClick={handleResetPreferences}>
                  Reset
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}