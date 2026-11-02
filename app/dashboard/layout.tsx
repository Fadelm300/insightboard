import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Box, Toolbar } from "@mui/material";

import AuthGuard from "@/components/auth/AuthGuard";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await getCurrentUser())) redirect("/login");

  return (
    <AuthGuard>
      <Box
        sx={{
          display: "flex",
          minHeight: "100dvh",
          width: "100%",
          maxWidth: "100vw",
          overflowX: "hidden",
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
            minWidth: 0,
            width: "100%",
            maxWidth: "100vw",
            minHeight: "100dvh",
            overflowX: "hidden",
            p: { xs: 1.5, sm: 2, xl: 3 },
            bgcolor: "background.default",
            color: "text.primary",
            transition: "background-color 200ms ease, color 200ms ease",
          }}
        >
          <Toolbar sx={{ minHeight: { xs: 64, xl: 72 } }} />
          {children}
        </Box>
      </Box>
    </AuthGuard>
  );
}