import { Box } from "@mui/material";

import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f5f6f8",
        p: 2,
      }}
    >
      <LoginForm />
    </Box>
  );
}