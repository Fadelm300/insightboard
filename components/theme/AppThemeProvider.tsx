"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

const THEME_MODE_KEY = "insightboard_theme_mode";

type SavedThemeMode = "Light" | "Dark" | "System";
type EffectiveMode = "light" | "dark";

function getSavedThemeMode(): SavedThemeMode {
  if (typeof window === "undefined") return "Light";

  const saved = localStorage.getItem(THEME_MODE_KEY);

  if (saved === "Light" || saved === "Dark" || saved === "System") {
    return saved;
  }

  return "Light";
}

function getSystemMode(): EffectiveMode {
  if (typeof window === "undefined") return "light";

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getEffectiveMode(savedMode: SavedThemeMode): EffectiveMode {
  if (savedMode === "Dark") return "dark";
  if (savedMode === "Light") return "light";
  return getSystemMode();
}

export default function AppThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [themeMode, setThemeMode] = useState<SavedThemeMode>("Light");
  const [systemMode, setSystemMode] = useState<EffectiveMode>("light");

  useEffect(() => {
    function syncThemeMode() {
      setThemeMode(getSavedThemeMode());
      setSystemMode(getSystemMode());
    }

    syncThemeMode();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    window.addEventListener("storage", syncThemeMode);
    window.addEventListener("insightboard-theme-changed", syncThemeMode);
    mediaQuery.addEventListener("change", syncThemeMode);

    return () => {
      window.removeEventListener("storage", syncThemeMode);
      window.removeEventListener("insightboard-theme-changed", syncThemeMode);
      mediaQuery.removeEventListener("change", syncThemeMode);
    };
  }, []);

  const effectiveMode = useMemo(() => {
    if (themeMode === "System") return systemMode;
    return getEffectiveMode(themeMode);
  }, [themeMode, systemMode]);

  useEffect(() => {
    document.documentElement.dataset.theme = effectiveMode;
  }, [effectiveMode]);

  const isDark = effectiveMode === "dark";

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: effectiveMode,
          primary: {
            main: "#4F46E5",
            dark: "#1E40AF",
            light: "#60A5FA",
          },
          success: {
            main: "#10B981",
          },
          info: {
            main: "#0EA5E9",
          },
          warning: {
            main: "#F59E0B",
          },
          error: {
            main: "#EF4444",
          },
          background: {
            default: isDark ? "#0F172A" : "#F8FAFC",
            paper: isDark ? "#111827" : "#FFFFFF",
          },
          text: {
            primary: isDark ? "#F8FAFC" : "#0F172A",
            secondary: isDark ? "#94A3B8" : "#64748B",
          },
          divider: isDark
            ? "rgba(148, 163, 184, 0.18)"
            : "rgba(148, 163, 184, 0.28)",
        },
        typography: {
          fontFamily: "Arial, Helvetica, sans-serif",
          h4: {
            fontWeight: 800,
            letterSpacing: "-0.03em",
          },
          h5: {
            fontWeight: 800,
            letterSpacing: "-0.02em",
          },
          h6: {
            fontWeight: 750,
          },
          button: {
            fontWeight: 700,
            textTransform: "none",
          },
        },
        shape: {
          borderRadius: 14,
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                background: isDark
                  ? "radial-gradient(circle at top right, rgba(37, 99, 235, 0.16), transparent 34%), #0F172A"
                  : "radial-gradient(circle at top right, rgba(37, 99, 235, 0.10), transparent 32%), #F8FAFC",
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 16,
                border: isDark
                  ? "1px solid rgba(148, 163, 184, 0.16)"
                  : "1px solid rgba(226, 232, 240, 0.95)",
                backgroundImage: isDark
                  ? "linear-gradient(145deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.96))"
                  : "linear-gradient(145deg, #FFFFFF, #F8FAFC)",
                boxShadow: isDark
                  ? "0 18px 45px rgba(0, 0, 0, 0.30), 0 0 28px rgba(37, 99, 235, 0.08)"
                  : "0 18px 45px rgba(15, 23, 42, 0.08)",
              },
            },
          },
      MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                paddingInline: 18,
                minHeight: 40,

                "&.MuiButton-containedPrimary": {
                  background: "linear-gradient(135deg, #4F46E5, #1E40AF)",
                  boxShadow: isDark
                    ? "0 0 24px rgba(59, 130, 246, 0.24)"
                    : "0 12px 24px rgba(37, 99, 235, 0.22)",
                },

                "&.MuiButton-containedPrimary:hover": {
                  background: "linear-gradient(135deg, #4338CA, #1D4ED8)",
                },

                "&.MuiButton-outlined": {
                  borderColor: isDark
                    ? "rgba(148, 163, 184, 0.28)"
                    : "rgba(100, 116, 139, 0.32)",
                },
              },
            },
          },

          MuiTextField: {
            defaultProps: {
              variant: "outlined",
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                backgroundColor: isDark
                  ? "rgba(15, 23, 42, 0.72)"
                  : "rgba(255, 255, 255, 0.92)",
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#4F46E5",
                  boxShadow: isDark
                    ? "0 0 0 3px rgba(79, 70, 229, 0.22)"
                    : "0 0 0 3px rgba(79, 70, 229, 0.12)",
                },
              },
              notchedOutline: {
                borderColor: isDark
                  ? "rgba(148, 163, 184, 0.22)"
                  : "rgba(148, 163, 184, 0.36)",
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              root: {
                borderColor: isDark
                  ? "rgba(148, 163, 184, 0.14)"
                  : "rgba(226, 232, 240, 0.95)",
              },
              head: {
                color: isDark ? "#CBD5E1" : "#334155",
                fontWeight: 800,
                backgroundColor: isDark
                  ? "rgba(15, 23, 42, 0.42)"
                  : "rgba(248, 250, 252, 0.9)",
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 999,
                fontWeight: 700,
              },
            },
          },
          MuiAlert: {
            styleOverrides: {
              root: {
                borderRadius: 14,
              },
            },
          },
        },
      }),
    [effectiveMode, isDark]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}