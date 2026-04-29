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

function getUserFromResponse(response: MeResponse): User | null {
  if (response.data?.user) return response.data.user;
  if (response.user) return response.user;
  return null;
}

export default function SettingsPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [businessName, setBusinessName] = useState("InsightBoard CRM");
  const [currency, setCurrency] = useState("BHD");
  const [themeMode, setThemeMode] = useState("Light");

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

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
                label="Currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                fullWidth
              />

              <TextField
                label="Theme Mode"
                value={themeMode}
                onChange={(event) => setThemeMode(event.target.value)}
                fullWidth
              />

              <Alert severity="info">
                These settings are frontend placeholders for now. Later we can
                save them in database or local storage.
              </Alert>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}