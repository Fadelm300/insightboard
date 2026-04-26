"use client";

import { AppBar, Toolbar, Typography, Box } from "@mui/material";

export default function Topbar() {
  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: "calc(100% - 240px)",
        ml: "240px",
        bgcolor: "background.paper",
        color: "text.primary",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <Toolbar>
        <Box>
<Typography variant="h6" sx={{ fontWeight: 700 }}>
              Business Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage clients, deals, projects, and revenue
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
}