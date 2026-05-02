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
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

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

type ThemeMode = "Light" | "Dark" | "System";

const BUSINESS_NAME_KEY = "insightboard_business_name";
const CURRENCY_KEY = "insightboard_currency";
const THEME_MODE_KEY = "insightboard_theme_mode";

const DEFAULT_BUSINESS_NAME = "InsightBoard CRM";
const DEFAULT_CURRENCY = "BHD";
const DEFAULT_THEME_MODE: ThemeMode = "Light";

function getUserFromResponse(response: MeResponse): User | null {
  if (response.data?.user) return response.data.user;
  if (response.user) return response.user;
  return null;
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "Light" || value === "Dark" || value === "System";
}

function notifyThemeChanged() {
  window.dispatchEvent(new Event("insightboard-theme-changed"));
}

function cleanSingleLineText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function hasUnsafeCharacters(value: string) {
  return /[<>{}\[\]`$|\\]/.test(value);
}

function hasUnsafePattern(value: string) {
  return /(javascript:|data:|on\w+\s*=|<\s*script)/i.test(value);
}

function validateBusinessName(value: string) {
  const cleanedValue = cleanSingleLineText(value);

  if (!cleanedValue) {
    return {
      value: DEFAULT_BUSINESS_NAME,
      error: "",
    };
  }

  if (cleanedValue.length > 80) {
    return {
      value: cleanedValue,
      error: "Business name must be 80 characters or less",
    };
  }

  if (hasUnsafeCharacters(cleanedValue) || hasUnsafePattern(cleanedValue)) {
    return {
      value: cleanedValue,
      error: "Business name contains invalid characters",
    };
  }

  return {
    value: cleanedValue,
    error: "",
  };
}

export default function SettingsPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [businessName, setBusinessName] = useState(DEFAULT_BUSINESS_NAME);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [themeMode, setThemeMode] = useState<ThemeMode>(DEFAULT_THEME_MODE);

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
    if (isThemeMode(savedThemeMode)) setThemeMode(savedThemeMode);
  }

  function handleSavePreferences() {
    setSavingPreferences(true);
    setError("");
    setSuccess("");

    try {
      const businessNameValidation = validateBusinessName(businessName);

      if (businessNameValidation.error) {
        setError(businessNameValidation.error);
        setSavingPreferences(false);
        return;
      }

      localStorage.setItem(BUSINESS_NAME_KEY, businessNameValidation.value);
      localStorage.setItem(CURRENCY_KEY, currency);
      localStorage.setItem(THEME_MODE_KEY, themeMode);

      setBusinessName(businessNameValidation.value);
      notifyThemeChanged();

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

    notifyThemeChanged();

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
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            letterSpacing: "-0.04em",
          }}
        >
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
        <Card
          sx={{
            borderRadius: 4,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            bgcolor: "background.paper",
            overflow: "hidden",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 3,
                display: "grid",
                placeItems: "center",
                mb: 2,
                fontWeight: 900,
                fontSize: 22,
                color: "primary.main",
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                border: (theme) =>
                  `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
              }}
            >
              {(user?.name || "A").charAt(0).toUpperCase()}
            </Box>

            <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 900 }}>
              Account
            </Typography>

            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Current authenticated dashboard user.
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
            </Box>

            <Divider sx={{ my: 3 }} />

            <Button
              variant="contained"
              color="error"
              onClick={handleLogout}
              disabled={loggingOut}
              sx={{
                height: 44,
                borderRadius: 2,
                fontWeight: 800,
              }}
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </Button>
          </CardContent>
        </Card>

        <Card
          sx={{
            borderRadius: 4,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            bgcolor: "background.paper",
            overflow: "hidden",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 3,
                display: "grid",
                placeItems: "center",
                mb: 2,
                fontWeight: 900,
                fontSize: 22,
                color: "success.main",
                bgcolor: (theme) => alpha(theme.palette.success.main, 0.12),
                border: (theme) =>
                  `1px solid ${alpha(theme.palette.success.main, 0.18)}`,
              }}
            >
              ⚙
            </Box>

            <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 900 }}>
              Dashboard Preferences
            </Typography>

            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Customize local dashboard preferences and theme mode.
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Business Name"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                fullWidth
                helperText="Used as the local dashboard business label."
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
                onChange={(event) =>
                  setThemeMode(event.target.value as ThemeMode)
                }
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
                  sx={{
                    height: 44,
                    borderRadius: 2,
                    fontWeight: 800,
                  }}
                >
                  {savingPreferences ? "Saving..." : "Save Settings"}
                </Button>

                <Button
                  variant="outlined"
                  onClick={handleResetPreferences}
                  sx={{
                    height: 44,
                    borderRadius: 2,
                    fontWeight: 800,
                  }}
                >
                  Reset
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}