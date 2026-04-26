import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Divider,
} from "@mui/material";
import { recentDeals } from "@/lib/mock/dashboard";

function getStatusColor(status: string) {
  if (status === "Closed Won") return "success";
  if (status === "Negotiation") return "warning";
  return "default";
}

export default function RecentDeals() {
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
          Recent Deals
        </Typography>

        {recentDeals.map((deal, index) => (
          <Box key={deal.company}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gap: 2,
                py: 1.5,
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 600 }}>{deal.company}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {deal.service} · {deal.budget}
                </Typography>
              </Box>

              <Chip
                label={deal.status}
                color={getStatusColor(deal.status)}
                size="small"
              />
            </Box>

            {index !== recentDeals.length - 1 && <Divider />}
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}