"use client";

import Link from "next/link";
import { Alert, Box, Button, Typography } from "@mui/material";

export default function PermissionDenied({ home }: { home: string | null }) {
  return (
    <Box sx={{ maxWidth: 620, mx: "auto", py: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom>Access restricted</Typography>
      <Alert severity="info">Your account does not have permission to view this section. Contact your manager to request access.</Alert>
      <Button component={Link} href={home ?? "/"} sx={{ mt: 2 }}>Go to an available page</Button>
    </Box>
  );
}
