"use client";

import { useRouter } from "next/navigation";
import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";

import { removeToken } from "@/lib/apiClient";

export default function Topbar() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch {
      // حتى لو فشل logout API، بنمسح التوكن من الفرونت
    }

    removeToken();
    router.replace("/login");
  }

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: "calc(100% - 240px)",
        ml: "240px",
        bgcolor: "white",
        color: "text.primary",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Business Overview
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Manage clients, deals, projects, and revenue
          </Typography>
        </Box>

        <Button variant="outlined" color="error" onClick={handleLogout}>
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
}