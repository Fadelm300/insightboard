import { Box } from "@mui/material";

import LoginForm from "@/components/auth/LoginForm";
import { isDemoMode } from "@/lib/demoMode";

export default function LoginPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        color: "text.primary",
        p: 2,
      }}
    >
      <LoginForm demoMode={isDemoMode()} />
    </Box>
  );
}