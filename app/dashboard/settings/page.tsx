"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [themeMode, setThemeMode] = useState<ThemeMode>(DEFAULT_THEME_MODE);

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

 const fetchUser = useCallback(async () => {
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
  }, []);

  const loadPreferences = useCallback(() => {
    if (typeof window === "undefined") return;

    const savedBusinessName = localStorage.getItem(BUSINESS_NAME_KEY);
    const savedThemeMode = localStorage.getItem(THEME_MODE_KEY);

    if (savedBusinessName) setBusinessName(savedBusinessName);
    if (isThemeMode(savedThemeMode)) setThemeMode(savedThemeMode);
  }, []);

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
    localStorage.removeItem(THEME_MODE_KEY);

    setBusinessName(DEFAULT_BUSINESS_NAME);
    setThemeMode(DEFAULT_THEME_MODE);

    notifyThemeChanged();

    setSuccess("Settings reset successfully");
    setError("");
  }

 async function handleLogout() {
  setLoggingOut(true);
  setError("");

  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch {
  } finally {
    removeToken();
    router.replace("/");
    router.refresh();
  }
}

        useEffect(() => {
          const timeoutId = window.setTimeout(() => {
            loadPreferences();
            void fetchUser();
          }, 0);

          return () => window.clearTimeout(timeoutId);
        }, [fetchUser, loadPreferences]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: 260,
            height: 260,
            borderRadius: "50%",
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.14),
            filter: "blur(70px)",
          }}
        />
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ position: "relative", overflow: "hidden", pb: 2 }}>
 

     

      <Box sx={{ position: "relative", zIndex: 1 }}>
        <Card
          sx={{
            mb: 3,
            borderRadius: 5,
            overflow: "hidden",
            border: (theme) =>
              `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? alpha(theme.palette.primary.main, 0.08)
                : alpha(theme.palette.primary.main, 0.04),
            backgroundImage: (theme) =>
              `radial-gradient(circle at top right, ${alpha(
                theme.palette.primary.main,
                theme.palette.mode === "dark" ? 0.28 : 0.14,
              )}, transparent 34%), linear-gradient(135deg, ${alpha(
                theme.palette.background.paper,
                0.92,
              )}, ${alpha(theme.palette.background.paper, 0.72)})`,
            boxShadow: (theme) =>
              `0 24px 80px ${alpha(theme.palette.primary.main, 0.12)}`,
          }
        }
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                justifyContent: "space-between",
                alignItems: { xs: "flex-start", md: "center" },
                gap: 2.5,
              }}
            >
              <Box>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1.5,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 999,
                    color: "primary.main",
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    border: (theme) =>
                      `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      boxShadow: (theme) =>
                        `0 0 16px ${alpha(theme.palette.primary.main, 0.8)}`,
                    }}
                  />
                  Admin Control Center
                </Box>

                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 900,
                    letterSpacing: "-0.05em",
                    fontSize: { xs: 30, md: 38 },
                  }}
                >
                  Settings
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{ mt: 1, maxWidth: 760, lineHeight: 1.8 }}
                >
                  Manage account information, dashboard preferences, local
                  business labels and theme mode from one clean place.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" },
                  gap: 1.5,
                  width: { xs: "100%", md: "auto" },
                  minWidth: { md: 430 },
                }}
              >
                {[
                  { label: "Business", value: businessName },
                  { label: "Currency", value: DEFAULT_CURRENCY },
                  { label: "Theme", value: themeMode },
                ].map((item) => (
                  <Box
                    key={item.label}
                    sx={{
                      borderRadius: 2,
                      p: 1.5,
                      bgcolor: (theme) =>
                        alpha(theme.palette.background.paper, 0.68),
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                      backdropFilter: "blur(16px)",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: "text.secondary",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {item.label}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.5,
                        fontWeight: 900,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2, borderRadius: 3 }}
            onClose={() => setError("")}
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            severity="success"
            sx={{ mb: 2, borderRadius: 3 }}
            onClose={() => setSuccess("")}
          >
            {success}
          </Alert>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "0.92fr 1.08fr" },
            gap: 3,
          }}
        >
          <Card
            sx={{
              position: "relative",
              borderRadius: 5,
              border: (theme) =>
                `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
              bgcolor: "background.paper",
              overflow: "hidden",
              boxShadow: (theme) =>
                `0 24px 70px ${alpha(theme.palette.primary.main, 0.1)}`,
              "&::before": {
                content: '""',
                position: "absolute",
                inset: 0,
                background: (theme) =>
                  `radial-gradient(circle at top left, ${alpha(
                    theme.palette.primary.main,
                    0.16,
                  )}, transparent 34%)`,
                pointerEvents: "none",
              },
            }}
          >
            <CardContent sx={{ position: "relative", p: { xs: 2.5, md: 3 } }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  mb: 3,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{
                      width: 58,
                      height: 58,
                      borderRadius: 4,
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 900,
                      fontSize: 24,
                      color: "primary.main",
                      bgcolor: (theme) =>
                        alpha(theme.palette.primary.main, 0.12),
                      border: (theme) =>
                        `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
                      boxShadow: (theme) =>
                        `0 0 36px ${alpha(theme.palette.primary.main, 0.18)}`,
                    }}
                  >
                    {(user?.name || "A").charAt(0).toUpperCase()}
                  </Box>

                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      Account
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.3 }}>
                      Current authenticated dashboard user.
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 900,
                    color: "success.main",
                    bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
                    border: (theme) =>
                      `1px solid ${alpha(theme.palette.success.main, 0.18)}`,
                  }}
                >
                  Active
                </Box>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  label="Name"
                  value={user?.name || "Admin User"}
                  fullWidth
                  disabled
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 3,
                    },
                  }}
                />

                <TextField
                  label="Email"
                  value={user?.email || ""}
                  fullWidth
                  disabled
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 3,
                    },
                  }}
                />

                <TextField
                  label="Role"
                  value={user?.role || "admin"}
                  fullWidth
                  disabled
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 3,
                    },
                  }}
                />
              </Box>

              <Divider sx={{ my: 3 }} />

              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  justifyContent: "space-between",
                  alignItems: { xs: "stretch", sm: "center" },
                  gap: 2,
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 900 }}>Session</Typography>
                  <Typography variant="body2" color="text.secondary">
                    End the current authenticated dashboard session.
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  color="error"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  sx={{
                    height: 44,
                    borderRadius: 3,
                    fontWeight: 900,
                    px: 3,
                    boxShadow: (theme) =>
                      `0 14px 32px ${alpha(theme.palette.error.main, 0.22)}`,
                  }}
                >
                  {loggingOut ? "Logging out..." : "Logout"}
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{
              position: "relative",
              borderRadius: 5,
              border: (theme) =>
                `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
              bgcolor: "background.paper",
              overflow: "hidden",
              boxShadow: (theme) =>
                `0 24px 70px ${alpha(theme.palette.primary.main, 0.1)}`,
              "&::before": {
                content: '""',
                position: "absolute",
                inset: 0,
                background: (theme) =>
                  `radial-gradient(circle at top right, ${alpha(
                    theme.palette.info.main,
                    0.16,
                  )}, transparent 34%)`,
                pointerEvents: "none",
              },
            }}
          >
            <CardContent sx={{ position: "relative", p: { xs: 2.5, md: 3 } }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  mb: 3,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{
                      width: 58,
                      height: 58,
                      borderRadius: 4,
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 900,
                      fontSize: 23,
                      color: "primary.main",
                      bgcolor: (theme) =>
                        alpha(theme.palette.primary.main, 0.12),
                      border: (theme) =>
                        `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
                      boxShadow: (theme) =>
                        `0 0 36px ${alpha(theme.palette.primary.main, 0.18)}`,
                    }}
                  >
                    ⚙
                  </Box>

                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      Dashboard Preferences
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.3 }}>
                      Customize local dashboard preferences and theme mode.
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  label="Business Name"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  fullWidth
                  helperText="Used as the local dashboard business label."
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 3,
                    },
                  }}
                />

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="Default Currency"
                    value={`${DEFAULT_CURRENCY} — Bahraini Dinar`}
                    fullWidth
                    disabled
                    helperText="InsightBoard currently uses Bahraini Dinar only."
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 3,
                      },
                    }}
                  />

                  <TextField
                    select
                    label="Theme Mode"
                    value={themeMode}
                    onChange={(event) =>
                      setThemeMode(event.target.value as ThemeMode)
                    }
                    fullWidth
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 3,
                      },
                    }}
                  >
                    <MenuItem value="Light">Light</MenuItem>
                    <MenuItem value="Dark">Dark</MenuItem>
                    <MenuItem value="System">System</MenuItem>
                  </TextField>
                </Box>

                <Alert
                  severity="info"
                  sx={{
                    borderRadius: 3,
                    border: (theme) =>
                      `1px solid ${alpha(theme.palette.info.main, 0.18)}`,
                    bgcolor: (theme) => alpha(theme.palette.info.main, 0.08),
                  }}
                >
                  Demo settings are saved locally in your browser for preview purposes.
                </Alert>

                <Box
                  sx={{
                    display: "flex",
                    gap: 1.25,
                    flexWrap: "wrap",
                    pt: 0.5,
                  }}
                >
                  <Button
                    variant="contained"
                    onClick={handleSavePreferences}
                    disabled={savingPreferences}
                    sx={{
                      height: 44,
                      borderRadius: 3,
                      fontWeight: 900,
                      px: 3,
                      boxShadow: (theme) =>
                        `0 14px 32px ${alpha(theme.palette.primary.main, 0.24)}`,
                    }}
                  >
                    {savingPreferences ? "Saving..." : "Save Settings"}
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={handleResetPreferences}
                    sx={{
                      height: 44,
                      borderRadius: 3,
                      fontWeight: 900,
                      px: 3,
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
    </Box>
  );
}
