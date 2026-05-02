"use client";

import { useRouter } from "next/navigation";
import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";

import { removeToken } from "@/lib/apiClient";

const drawerWidth = 240;

export default function Topbar() {
  const router = useRouter();

  async function handleLogout() {
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

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={(theme) => ({
        width: `calc(100% - ${drawerWidth}px)`,
        ml: `${drawerWidth}px`,
        bgcolor:
          theme.palette.mode === "dark"
            ? "rgba(15, 23, 42, 0.82)"
            : "rgba(255, 255, 255, 0.82)",
        color: "text.primary",
        borderBottom: "1px solid",
        borderColor: "divider",
        backdropFilter: "blur(18px)",
        boxShadow:
          theme.palette.mode === "dark"
            ? "0 10px 30px rgba(0, 0, 0, 0.22)"
            : "0 10px 30px rgba(15, 23, 42, 0.04)",
      })}
    >
      <Toolbar
        sx={{
          minHeight: { xs: 64, md: 72 },
          display: "flex",
          justifyContent: "space-between",
          gap: 2,
          px: { xs: 2, md: 3 },
        }}
      >
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            Business Overview
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Manage clients, deals, projects, and revenue
          </Typography>
        </Box>

        <Button
          variant="outlined"
          color="error"
          onClick={handleLogout}
          sx={{
            minWidth: 96,
            fontWeight: 800,
          }}
        >
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
}