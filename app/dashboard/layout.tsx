import { ReactNode } from "react";
import { Box, Toolbar } from "@mui/material";

import AuthGuard from "@/components/auth/AuthGuard";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthGuard>
      <Box
        sx={{
          display: "flex",
          minHeight: "100vh",
          bgcolor: "background.default",
          color: "text.primary",
        }}
      >
        <Sidebar />
        <Topbar />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minHeight: "100vh",
            p: { xs: 2, md: 3 },
            bgcolor: "background.default",
            color: "text.primary",
            transition: "background-color 200ms ease, color 200ms ease",
          }}
        >
          <Toolbar />
          {children}
        </Box>
      </Box>
    </AuthGuard>
  );
}