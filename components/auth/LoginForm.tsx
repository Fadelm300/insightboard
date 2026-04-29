"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";

import { setToken } from "@/lib/apiClient";

type LoginResponse = {
  success: boolean;
  message: string;
  data?: {
    token?: string;
    user?: {
      _id?: string;
      id?: string;
      name?: string;
      email?: string;
      role?: string;
    };
  };
  token?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateLoginForm(email: string, password: string) {
  const cleanEmail = normalizeEmail(email);

  if (!cleanEmail) {
    return "Email is required";
  }

  if (!isValidEmail(cleanEmail)) {
    return "Enter a valid email address";
  }

  if (!password) {
    return "Password is required";
  }

  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }

  return "";
}

function getFriendlyLoginError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("invalid credentials") ||
    lowerMessage.includes("invalid email or password")
  ) {
    return "Invalid email or password";
  }

  if (lowerMessage.includes("email and password are required")) {
    return "Email and password are required";
  }

  if (lowerMessage.includes("valid email")) {
    return "Enter a valid email address";
  }

  if (lowerMessage.includes("token")) {
    return "Login failed. Please try again.";
  }

  return message || "Login failed. Please try again.";
}

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateLoginForm(email, password);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizeEmail(email),
          password,
        }),
      });

      const data: LoginResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Login failed");
      }

      const token = data.data?.token || data.token;

      if (!token) {
        throw new Error("Token not found in login response");
      }

      setToken(token);
      router.replace("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(getFriendlyLoginError(message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card sx={{ width: "100%", maxWidth: 420, borderRadius: 3 }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            InsightBoard
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Login to your CRM dashboard
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Email"
            type="email"
            fullWidth
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              fullWidth
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              sx={{ mb: 3 }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        edge="end"
                        onClick={() => setShowPassword((current) => !current)}
                        onMouseDown={(event) => event.preventDefault()}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}