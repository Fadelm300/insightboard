"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Box, CircularProgress, Grid, Typography } from "@mui/material";
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

type Client = {
  _id: string;
  companyName: string;
};

type Deal = {
  _id: string;
  title: string;
  status: string;
};

type Project = {
  _id: string;
  name: string;
  status?: string;
  paymentStatus?: string;
};

type FinanceSummary = {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueCount: number;
  expenseCount: number;
};

type MonthlyFinance = {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
};

type ApiListResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T[] | Record<string, T[]>;
  clients?: T[];
  deals?: T[];
  projects?: T[];
  monthly?: T[];
  months?: T[];
  items?: T[];
  records?: T[];
};

type ApiObjectResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

const icons = [
  <PeopleIcon color="primary" key="clients" />,
  <HandshakeIcon color="primary" key="deals" />,
  <PaymentsIcon color="primary" key="revenue" />,
  <TrendingUpIcon color="primary" key="profit" />,
];

const emptySummary: FinanceSummary = {
  totalRevenue: 0,
  totalExpenses: 0,
  netProfit: 0,
  revenueCount: 0,
  expenseCount: 0,
};

function extractList<T>(response: ApiListResponse<T>, keys: string[]): T[] {
  if (Array.isArray(response.data)) return response.data;

  if (response.data && !Array.isArray(response.data)) {
    for (const key of keys) {
      const value = response.data[key];

      if (Array.isArray(value)) {
        return value;
      }
    }
  }

  for (const key of keys) {
    const value = response[key as keyof ApiListResponse<T>];

    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.records)) return response.records;

  return [];
}

function extractObject<T>(response: ApiObjectResponse<T>, fallback: T): T {
  if (response.data) return response.data;
  return fallback;
}

function formatMoney(value: number) {
  return `${Number(value || 0).toFixed(2)} BHD`;
}

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>(emptySummary);
  const [monthly, setMonthly] = useState<MonthlyFinance[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchDashboardData() {
    setLoading(true);
    setError("");

    try {
      const [
        clientsResponse,
        dealsResponse,
        projectsResponse,
        summaryResponse,
        monthlyResponse,
      ] = await Promise.all([
        apiFetch<ApiListResponse<Client>>("/api/clients"),
        apiFetch<ApiListResponse<Deal>>("/api/deals"),
        apiFetch<ApiListResponse<Project>>("/api/projects"),
        apiFetch<ApiObjectResponse<FinanceSummary>>("/api/finance/summary"),
        apiFetch<ApiListResponse<MonthlyFinance>>("/api/finance/monthly"),
      ]);

      setClients(extractList(clientsResponse, ["clients"]));
      setDeals(extractList(dealsResponse, ["deals"]));
      setProjects(extractList(projectsResponse, ["projects"]));
      setSummary(extractObject(summaryResponse, emptySummary));
      setMonthly(extractList(monthlyResponse, ["monthly", "months"]));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load dashboard data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const activeDealsCount = useMemo(() => {
    return deals.filter(
      (deal) => deal.status !== "Closed Won" && deal.status !== "Closed Lost"
    ).length;
  }, [deals]);

  const latestMonthRevenue = useMemo(() => {
    if (monthly.length === 0) return 0;

    const latestMonth = monthly[monthly.length - 1];
    return Number(latestMonth?.revenue || 0);
  }, [monthly]);

  const pendingPaymentsCount = useMemo(() => {
    return projects.filter((project) => project.paymentStatus !== "Paid")
      .length;
  }, [projects]);

  const dashboardStats = [
    {
      title: "Total Clients",
      value: String(clients.length),
      helperText: "Active CRM clients",
    },
    {
      title: "Active Deals",
      value: String(activeDealsCount),
      helperText: "Open sales opportunities",
    },
    {
      title: "Monthly Revenue",
      value: formatMoney(latestMonthRevenue),
      helperText: "Latest recorded month",
    },
    {
      title: "Total Profit",
      value: formatMoney(summary.netProfit),
      helperText: `${pendingPaymentsCount} pending payments`,
    },
  ];

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Dashboard
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Overview of your web design business performance.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

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