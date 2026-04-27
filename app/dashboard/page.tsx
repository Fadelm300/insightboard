import { Box, Grid, Typography } from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import HandshakeIcon from "@mui/icons-material/Handshake";
import PaymentsIcon from "@mui/icons-material/Payments";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

import RevenueChart from "@/components/dashboard/charts/RevenueChart";
import DealsPipelineChart from "@/components/dashboard/charts/DealsPipelineChart";
import ProjectStatusChart from "@/components/dashboard/charts/ProjectStatusChart";


import KPIBox from "@/components/dashboard/KPIBox";
import RecentDeals from "@/components/dashboard/RecentDeals";
import RevenueSummary from "@/components/dashboard/RevenueSummary";
import { dashboardStats } from "@/lib/mock/dashboard";

const icons = [
  <PeopleIcon color="primary" key="clients" />,
  <HandshakeIcon color="primary" key="deals" />,
  <PaymentsIcon color="primary" key="revenue" />,
  <TrendingUpIcon color="primary" key="profit" />,
];

export default function DashboardPage() {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Dashboard
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Overview of your web design business performance.
      </Typography>

      <Grid container spacing={3}>
        {dashboardStats.map((stat, index) => (
          <Grid key={stat.title} size={{ xs: 12, sm: 6, md: 3 }}>
            <KPIBox
              title={stat.title}
              value={stat.value}
              icon={icons[index]}
              helperText={stat.helperText}
            />
          </Grid>
        ))}

        <Grid size={{ xs: 12, md: 8 }}>
          <RecentDeals />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <RevenueSummary />
        </Grid>
      </Grid>


      <Box sx={{ mt: 4 }}>
        <Grid container spacing={3}>

          <Grid size={{ xs: 12, lg: 8 }}>
            <RevenueChart />
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <ProjectStatusChart />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <DealsPipelineChart />
          </Grid>

        </Grid>
      </Box>

    </Box>
  );
}