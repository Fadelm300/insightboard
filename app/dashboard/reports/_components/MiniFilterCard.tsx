import { Box, Typography } from "@mui/material";

type MiniFilterCardProps = {
  title: string;
  value: string | number;
};

export default function MiniFilterCard({ title, value }: MiniFilterCardProps) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 1.5,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>

      <Typography sx={{ fontWeight: 700, mt: 0.5 }}>{value}</Typography>
    </Box>
  );
}