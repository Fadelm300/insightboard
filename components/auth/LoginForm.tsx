"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

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

  if (!cleanEmail) return "Email is required";
  if (!isValidEmail(cleanEmail)) return "Enter a valid email address";
  if (!password) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";

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

function PulseIcon() {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      fill="none"
      sx={{ width: 26, height: 26 }}
    >
      <path
        d="M3 12h4l3-8 4 16 3-8h4"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Box>
  );
}

function EmailIcon() {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      fill="none"
      sx={{ width: 18, height: 18 }}
    >
      <rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Box>
  );
}

function LockIcon() {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      fill="none"
      sx={{ width: 18, height: 18 }}
    >
      <rect
        x="3"
        y="11"
        width="18"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M7 11V7a5 5 0 0 1 10 0v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Box>
  );
}

export default function LoginForm() {
  const router = useRouter();

  // يشتغل على اللابتوبات فقط: عرض متوسط + ارتفاع قصير
  // المقاس الكبير ما يتأثر.
  const compactLaptop =
    "@media (min-width: 900px) and (max-width: 1700px) and (max-height: 850px)";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      minHeight: { xs: 52, sm: 56, md: 58 },
      borderRadius: "999px",
      color: "#F8FBFF",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.085), rgba(255,255,255,0.045))",
      backdropFilter: "blur(10px)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
      transition: "all 0.2s ease",
      overflow: "hidden",

      [compactLaptop]: {
        minHeight: 50,
      },

      "& fieldset": {
        borderColor: alpha("#93C5FD", 0.22),
        borderWidth: 1.3,
      },

      "&:hover fieldset": {
        borderColor: alpha("#93C5FD", 0.38),
      },

      "&.Mui-focused": {
        background:
          "linear-gradient(180deg, rgba(96,165,250,0.12), rgba(255,255,255,0.055))",
        boxShadow: `0 0 0 3px ${alpha("#60A5FA", 0.16)}`,
      },

      "&.Mui-focused fieldset": {
        borderColor: "#60A5FA",
      },
    },

    "& .MuiInputBase-input": {
      color: "#F8FBFF",
      fontSize: { xs: 15, sm: 15.5, md: 16 },
      fontWeight: 700,
      py: { xs: 1.45, sm: 1.65, md: 1.8 },

      [compactLaptop]: {
        fontSize: 15,
        py: 1.35,
      },

      "&::placeholder": {
        color: alpha("#BFDBFE", 0.65),
        opacity: 1,
      },
    },

    "& .MuiInputAdornment-root": {
      color: "#60A5FA",
    },

    "& input:-webkit-autofill": {
      WebkitTextFillColor: "#F8FBFF",
      caretColor: "#F8FBFF",
      WebkitBoxShadow: `0 0 0 1000px #284E86 inset`,
      boxShadow: `0 0 0 1000px #284E86 inset`,
      borderRadius: "999px",
      transition: "background-color 9999s ease-in-out 0s",
    },

    "& input:-webkit-autofill:hover": {
      WebkitTextFillColor: "#F8FBFF",
      caretColor: "#F8FBFF",
      WebkitBoxShadow: `0 0 0 1000px #284E86 inset`,
      boxShadow: `0 0 0 1000px #284E86 inset`,
      borderRadius: "999px",
    },

    "& input:-webkit-autofill:focus": {
      WebkitTextFillColor: "#F8FBFF",
      caretColor: "#F8FBFF",
      WebkitBoxShadow: `0 0 0 1000px #315B99 inset`,
      boxShadow: `0 0 0 1000px #315B99 inset`,
      borderRadius: "999px",
    },
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: {
          xs: "calc(100vw - 24px)",
          sm: "calc(100vw - 40px)",
          lg: 1180,
        },
        minHeight: {
          xs: "auto",
          sm: "auto",
          md: 700,
        },
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        borderRadius: { xs: 4, sm: 5, md: 6 },
        overflow: "hidden",
        position: "relative",
        bgcolor: "#102A58",
        isolation: "isolate",

        // فقط اللابتوب يصغر
        [compactLaptop]: {
          maxWidth: 944,
          minHeight: 560,
        },

        boxShadow: `
          0 0 0 3px rgba(56,189,248,0.26),
          0 0 52px rgba(56,189,248,0.42),
          0 0 95px rgba(56,189,248,0.30),
          0 0 110px rgba(37,99,235,0.22),
          0 40px 100px rgba(0,0,0,0.45)
        `,

        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          padding: "2.5px",
          background: `
            conic-gradient(
              from 0deg,
              transparent 0deg,
              transparent 18deg,
              rgba(56,189,248,0.08) 30deg,
              rgba(125,211,252,0.95) 48deg,
              rgba(59,130,246,1) 66deg,
              rgba(147,197,253,0.88) 84deg,
              rgba(56,189,248,0.18) 102deg,
              transparent 128deg,
              transparent 180deg,
              rgba(56,189,248,0.08) 208deg,
              rgba(125,211,252,0.82) 228deg,
              rgba(59,130,246,0.95) 246deg,
              rgba(147,197,253,0.70) 262deg,
              transparent 286deg,
              transparent 360deg
            )
          `,
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          filter:
            "drop-shadow(0 0 10px rgba(21, 31, 35, 0.95)) drop-shadow(0 0 24px rgba(59,130,246,0.70)) drop-shadow(0 0 42px rgba(96,165,250,0.35))",
          pointerEvents: "none",
          zIndex: 20,
          animation: "neonWaveFlow 12s linear infinite",
        },

        "&::after": {
          content: '""',
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          boxShadow: `
            inset 0 0 18px rgba(56,189,248,0.20),
            inset 0 0 40px rgba(59,130,246,0.12),
            inset 0 0 70px rgba(96,165,250,0.06)
          `,
          pointerEvents: "none",
          zIndex: 19,
          animation: "neonGlowPulse 5.5s ease-in-out infinite",
        },

        "@keyframes neonWaveFlow": {
          "0%": {
            transform: "rotate(0deg) scale(1)",
          },
          "25%": {
            transform: "rotate(90deg) scale(1.006)",
          },
          "50%": {
            transform: "rotate(180deg) scale(1)",
          },
          "75%": {
            transform: "rotate(270deg) scale(1.006)",
          },
          "100%": {
            transform: "rotate(360deg) scale(1)",
          },
        },

        "@keyframes neonGlowPulse": {
          "0%, 100%": {
            opacity: 0.82,
          },
          "50%": {
            opacity: 1,
          },
        },

        "@keyframes floatA": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-14px) rotate(5deg)" },
        },

        "@keyframes floatB": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(12px) rotate(-4deg)" },
        },

        "@keyframes spinShape": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      }}
    >
      <Box
        sx={{
          width: { md: "46%" },
          display: { xs: "none", md: "flex" },
          position: "relative",
          overflow: "hidden",
          flexDirection: "column",
          justifyContent: "center",
          px: { md: 4, lg: 6 },
          py: { md: 5, lg: 6 },
          background:
            "linear-gradient(145deg, #1E40AF 0%, #312E81 42%, #0F172A 100%)",

          [compactLaptop]: {
            px: 4,
            py: 4,
          },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background:
              "linear-gradient(90deg, transparent, #6366F1, #38BDF8, transparent)",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            top: 30,
            left: 30,
            width: 140,
            height: 140,
            backgroundImage:
              "radial-gradient(rgba(147,197,253,0.35) 1.5px, transparent 1.5px)",
            backgroundSize: "18px 18px",
            opacity: 0.5,
          }}
        />

        <Box
          sx={{
            position: "absolute",
            width: 240,
            height: 240,
            borderRadius: "50%",
            bottom: -70,
            right: -60,
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.55), rgba(30,64,175,0.28))",
            border: "1.5px solid rgba(129,140,248,0.35)",
            animation: "floatA 6s ease-in-out infinite",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            width: 130,
            height: 130,
            borderRadius: "50%",
            top: 55,
            right: 48,
            background:
              "linear-gradient(135deg, rgba(79,70,229,0.42), rgba(37,99,235,0.2))",
            border: "1.5px solid rgba(99,102,241,0.28)",
            animation: "floatB 7s ease-in-out infinite",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            width: 90,
            height: 90,
            top: 270,
            right: -20,
            background: "rgba(99,102,241,0.18)",
            border: "1.5px solid rgba(129,140,248,0.3)",
            clipPath:
              "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
            animation: "spinShape 18s linear infinite",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            width: 0,
            height: 0,
            borderLeft: "35px solid transparent",
            borderRight: "35px solid transparent",
            borderBottom: "60px solid rgba(99,102,241,0.18)",
            top: 120,
            left: 40,
            animation: "floatA 8s ease-in-out infinite reverse",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            width: 60,
            height: 60,
            top: 430,
            right: 110,
            background: "rgba(147,197,253,0.10)",
            border: "1px solid rgba(147,197,253,0.24)",
            transform: "rotate(45deg)",
            animation: "floatA 10s ease-in-out infinite reverse",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            width: 170,
            height: 170,
            borderRadius: "50%",
            border: "1px solid rgba(129,140,248,0.16)",
            bottom: 80,
            left: -60,
            animation: "floatB 11s ease-in-out infinite",
          }}
        />

        <Box sx={{ position: "relative", zIndex: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              mb: 4,

              [compactLaptop]: {
                mb: 3,
              },
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #6366F1, #4F46E5)",
                boxShadow: "0 0 24px rgba(99,102,241,0.5)",

                [compactLaptop]: {
                  width: 50,
                  height: 50,
                },
              }}
            >
              <PulseIcon />
            </Box>

            <Typography
              sx={{
                color: "#FFFFFF",
                fontSize: { md: 36, lg: 42 },
                fontWeight: 900,
                letterSpacing: "-0.05em",

                [compactLaptop]: {
                  fontSize: 36,
                },
              }}
            >
              InsightBoard
            </Typography>
          </Box>

          <Typography
            sx={{
              color: "#FFFFFF",
              fontSize: { md: 40, lg: 58 },
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: "-0.06em",
              mb: 2,

              [compactLaptop]: {
                fontSize: 46,
                mb: 1.5,
              },
            }}
          >
            Your Business,
            <br />
            <Box
              component="span"
              sx={{
                background: "linear-gradient(90deg, #818CF8, #38BDF8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Fully Visible.
            </Box>
          </Typography>

          <Typography
            sx={{
              color: alpha("#CBD5E1", 0.8),
              fontSize: 18,
              lineHeight: 1.8,
              maxWidth: 360,
              mb: 4,

              [compactLaptop]: {
                fontSize: 16,
                lineHeight: 1.65,
                mb: 3,
              },
            }}
          >
            Enterprise CRM intelligence that helps you close faster, sell
            smarter, and grow confidently.
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.6,
              maxWidth: 420,

              [compactLaptop]: {
                gap: 1.1,
                maxWidth: 400,
              },
            }}
          >
            {[
              ["#10B981", "Real-time revenue tracking"],
              ["#38BDF8", "Smart deal pipeline insights"],
              ["#F59E0B", "Automated client reports"],
            ].map(([color, text]) => (
              <Box
                key={text}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 2.2,
                  py: 1.5,
                  borderRadius: 3,
                  bgcolor: alpha("#FFFFFF", 0.06),
                  border: `1px solid ${alpha("#FFFFFF", 0.1)}`,
                  color: alpha("#F8FAFC", 0.88),

                  [compactLaptop]: {
                    px: 2,
                    py: 1.15,
                  },
                }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: color,
                    boxShadow: `0 0 10px ${color}`,
                    flexShrink: 0,
                  }}
                />

                <Typography
                  sx={{
                    fontSize: 15,
                    fontWeight: 600,

                    [compactLaptop]: {
                      fontSize: 14,
                    },
                  }}
                >
                  {text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 2.25, sm: 4, md: 5, lg: 6 },
          py: { xs: 3, sm: 4, md: 6 },
          minHeight: { xs: "auto", sm: "auto", md: "auto" },
          overflow: "hidden",
          background: "linear-gradient(180deg, #234983 0%, #1D4178 100%)",

          [compactLaptop]: {
            px: 5,
            py: 4,
          },

          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(rgba(147,197,253,0.08) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            pointerEvents: "none",
          },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 200,
            height: 200,
            background:
              "radial-gradient(circle at top right, rgba(99,102,241,0.22), transparent 70%)",
          }}
        />

        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: 170,
            height: 170,
            background:
              "radial-gradient(circle at bottom left, rgba(56,189,248,0.14), transparent 70%)",
          }}
        />

        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{
            width: "100%",
            maxWidth: { xs: "100%", sm: 460 },
            position: "relative",
            zIndex: 2,

            [compactLaptop]: {
              maxWidth: 430,
            },
          }}
        >
          <Typography
            sx={{
              color: "#F8FAFC",
              fontSize: { xs: 28, sm: 38, md: 48 },
              fontWeight: 900,
              letterSpacing: "-0.05em",
              mb: 0.5,

              [compactLaptop]: {
                fontSize: 40,
              },
            }}
          >
            Welcome back
          </Typography>

          <Typography
            sx={{
              color: "#93C5FD",
              fontSize: { xs: 14, sm: 16, md: 17 },
              fontWeight: 500,
              mb: { xs: 3, sm: 4, md: 4.5 },

              [compactLaptop]: {
                fontSize: 15.5,
                mb: 3,
              },
            }}
          >
            Sign in to your InsightBoard account
          </Typography>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 2.5,
                borderRadius: 3,
                bgcolor: alpha("#EF4444", 0.14),
                color: "#FEE2E2",
                border: `1px solid ${alpha("#EF4444", 0.35)}`,

                [compactLaptop]: {
                  mb: 1.8,
                },

                "& .MuiAlert-icon": {
                  color: "#FCA5A5",
                },
              }}
              onClose={() => setError("")}
            >
              {error}
            </Alert>
          )}

          <Box
            sx={{
              mb: { xs: 1.7, sm: 2.1, md: 2.3 },

              [compactLaptop]: {
                mb: 1.6,
              },
            }}
          >
            <Typography
              sx={{
                mb: { xs: 0.8, md: 1 },
                color: "#93C5FD",
                fontSize: 12.5,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",

                [compactLaptop]: {
                  mb: 0.7,
                },
              }}
            >
              Email Address
            </Typography>

            <TextField
              fullWidth
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              sx={inputSx}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <Box
            sx={{
              mb: { xs: 1.8, sm: 2.1, md: 2.4 },

              [compactLaptop]: {
                mb: 1.7,
              },
            }}
          >
            <Typography
              sx={{
                mb: { xs: 0.8, md: 1 },
                color: "#93C5FD",
                fontSize: 12.5,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",

                [compactLaptop]: {
                  mb: 0.7,
                },
              }}
            >
              Password
            </Typography>

            <TextField
              fullWidth
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              sx={inputSx}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onClick={() => setShowPassword((current) => !current)}
                        onMouseDown={(event) => event.preventDefault()}
                        edge="end"
                        sx={{
                          color: "#60A5FA",

                          "&:hover": {
                            bgcolor: alpha("#60A5FA", 0.1),
                            color: "#BFDBFE",
                          },
                        }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "space-between",
              gap: { xs: 1.2, sm: 2 },
              mb: { xs: 2.7, sm: 3.5, md: 4 },

              [compactLaptop]: {
                mb: 2.5,
              },
            }}
          >
            <Box
              component="label"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.8,
                cursor: "pointer",
                color: "#93C5FD",
                fontSize: { xs: 14, md: 15 },
                fontWeight: 600,
                userSelect: "none",
              }}
            >
              <Checkbox
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                sx={{
                  p: 0,
                  color: alpha("#93C5FD", 0.55),

                  "&.Mui-checked": {
                    color: "#60A5FA",
                  },
                }}
              />

              Remember me
            </Box>

            <Button
              type="button"
              variant="text"
              sx={{
                minWidth: 0,
                p: 0,
                color: "#93C5FD",
                fontSize: { xs: 14, md: 15 },
                fontWeight: 700,
                textTransform: "none",

                "&:hover": {
                  bgcolor: "transparent",
                  color: "#BFDBFE",
                },
              }}
            >
              Forgot password?
            </Button>
          </Box>

          <Button
            type="submit"
            fullWidth
            disabled={loading}
            sx={{
              height: { xs: 52, sm: 56, md: 58 },
              borderRadius: "999px",
              textTransform: "none",
              fontSize: { xs: 15.5, sm: 16, md: 17 },
              fontWeight: 900,
              color: "#FFFFFF",
              background: "linear-gradient(135deg, #3B82F6, #6366F1)",
              boxShadow: "0 8px 28px rgba(59,130,246,0.35)",

              [compactLaptop]: {
                height: 52,
                fontSize: 16,
              },

              "&:hover": {
                background: "linear-gradient(135deg, #2563EB, #4F46E5)",
                boxShadow: "0 12px 34px rgba(99,102,241,0.42)",
              },

              "&:disabled": {
                color: alpha("#FFFFFF", 0.8),
                background: "linear-gradient(135deg, #3B82F6, #6366F1)",
                opacity: 0.7,
              },
            }}
          >
            {loading ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={20} sx={{ color: "#FFFFFF" }} />
                Signing in...
              </Box>
            ) : (
              "Sign in to Dashboard"
            )}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}