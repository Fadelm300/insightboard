import { Card, CardContent, Typography, Box } from "@mui/material";
import { ReactNode } from "react";

type KPIBoxProps = {
  title: string;
  value: string;
  icon: ReactNode;
  helperText?: string;
};

export default function KPIBox({
  title,
  value,
  icon,
  helperText,
}: KPIBoxProps) {
  return (
    <Card
      sx={{
        height: "100%",
        borderRadius: 3,
        boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>

          <Box>{icon}</Box>
        </Box>

        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {value}
        </Typography>

        {helperText && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {helperText}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}