import { Card, CardContent, Typography, Box, Divider } from "@mui/material";
import { revenueSummary } from "@/lib/mock/dashboard";

export default function RevenueSummary() {
  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
        height: "100%",
      }}
    >
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Revenue Summary
        </Typography>

        {revenueSummary.map((item, index) => (
          <Box key={item.label}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                py: 1.5,
              }}
            >
              <Typography color="text.secondary">{item.label}</Typography>
              <Typography sx={{ fontWeight: 700 }}>{item.value}</Typography>
            </Box>

            {index !== revenueSummary.length - 1 && <Divider />}
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}
