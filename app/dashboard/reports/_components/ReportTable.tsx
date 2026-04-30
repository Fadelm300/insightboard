import type { ReactNode } from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";

type ReportTableProps = {
  title: string;
  children: ReactNode;
};

export default function ReportTable({ title, children }: ReportTableProps) {
  return (
    <Card sx={{ borderRadius: 3, mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          {title}
        </Typography>

        <Box sx={{ overflowX: "auto" }}>{children}</Box>
      </CardContent>
    </Card>
  );
}