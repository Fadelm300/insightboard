"use client";

import Link from "next/link";
import { Box, Button, Paper, Typography } from "@mui/material";

export default function NotFound() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        color: "text.primary",
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 520,
          textAlign: "center",
          p: { xs: 4, md: 6 },
          borderRadius: 4,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Typography
          variant="h1"
          sx={{
            fontWeight: 800,
            fontSize: { xs: 72, md: 96 },
            lineHeight: 1,
            color: "primary.main",
            mb: 1,
          }}
        >
          404
        </Typography>

        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Page not found
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 4 }}>
          The page you are looking for does not exist or has been moved.
        </Typography>

        <Button
          component={Link}
          href="/dashboard"
          variant="contained"
          size="large"
        >
          Back to Dashboard
        </Button>
      </Paper>
    </Box>
  );
}