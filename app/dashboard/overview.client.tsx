"use client";

import { useEffect, useState } from "react";
import { Alert, Box, Button, Grid, Skeleton, Typography } from "@mui/material";
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
import { apiFetch } from "@/lib/apiClient";

import type { DashboardOverview } from "@/lib/dashboardOverviewTypes";

const icons = [
  <PeopleIcon key="clients" />,
  <HandshakeIcon key="deals" />,
  <PaymentsIcon key="revenue" />,
  <TrendingUpIcon key="profit" />,
];

function formatMoney(value: number) {
  return `${Number(value || 0).toFixed(2)} BHD`;
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      apiFetch<{ data: DashboardOverview }>("/api/dashboard/overview", { signal: controller.signal })
        .then(({ data }) => {
          if (!controller.signal.aborted) setOverview(data);
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted) {
            setError(cause instanceof Error ? cause.message : "Failed to load dashboard data");
          }
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [attempt]);

  if (error) {
    return (
      <Alert severity="error" action={<Button color="inherit" onClick={() => {
        setError("");
        setAttempt((previous) => previous + 1);
      }}>Retry</Button>}>
        {error}
      </Alert>
    );
  }

  if (!overview) {
    return (
      <Grid container spacing={{ xs: 2, md: 3 }} aria-label="Loading dashboard" aria-busy="true">
        {[0, 1, 2, 3].map((index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Skeleton variant="rounded" height={120} />
          </Grid>
        ))}
        <Grid size={{ xs: 12, lg: 8 }}><Skeleton variant="rounded" height={280} /></Grid>
        <Grid size={{ xs: 12, lg: 4 }}><Skeleton variant="rounded" height={280} /></Grid>
      </Grid>
    );
  }

  const { clientCount, activeDealsCount, pendingPaymentsCount, summary, monthly } = overview;
  const latestMonthRevenue = monthly.at(-1)?.revenue ?? 0;

  const dashboardStats = [
    {
      title: "Total Clients",
      value: String(clientCount),
      helperText: "Active CRM clients",
      icon: icons[0],
      tone: "primary" as const,
    },
    {
      title: "Active Deals",
      value: String(activeDealsCount),
      helperText: "Open sales opportunities",
      icon: icons[1],
      tone: "info" as const,
    },
    {
      title: "Monthly Revenue",
      value: formatMoney(latestMonthRevenue),
      helperText: "Latest recorded month",
      icon: icons[2],
      tone: "success" as const,
    },
    {
      title: "Total Profit",
      value: formatMoney(summary.netProfit),
      helperText: `${pendingPaymentsCount} pending payments`,
      icon: icons[3],
      tone: summary.netProfit >= 0 ? ("success" as const) : ("error" as const),
    },
  ];

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflowX: "hidden",
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            letterSpacing: "-0.04em",
          }}
        >
          Dashboard
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
          Overview of your web design business performance.
        </Typography>
      </Box>

      <Grid container spacing={{ xs: 2, md: 3 }}>
        {dashboardStats.map((stat) => (
          <Grid key={stat.title} size={{ xs: 12, sm: 6, lg: 3 }}>
            <KPIBox
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              helperText={stat.helperText}
              tone={stat.tone}
            />
          </Grid>
        ))}

        <Grid size={{ xs: 12, lg: 8 }}>
          <RecentDeals deals={overview.recentDeals} />
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <RevenueSummary summary={summary} />
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <RevenueChart monthlyData={monthly} />
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <ProjectStatusChart counts={overview.projectStatusCounts} />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <DealsPipelineChart counts={overview.dealStatusCounts} />
        </Grid>
      </Grid>
    </Box>
  );
}
