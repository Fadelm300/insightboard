import { Card, CardContent, Typography } from "@mui/material";

type ReportCardProps = {
  title: string;
  value: string | number;
};

export default function ReportCard({ title, value }: ReportCardProps) {
  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography color="text.secondary">{title}</Typography>

        <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}