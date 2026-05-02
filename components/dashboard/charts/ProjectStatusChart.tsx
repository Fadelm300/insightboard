"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
} from "recharts";

import { apiFetch } from "@/lib/apiClient";
import MeasuredChartBox from "@/components/dashboard/charts/MeasuredChartBox";

type Project = {
  _id: string;
  name: string;
  status?: string;
};

type ProjectsResponse = {
  success?: boolean;
  message?: string;
  data?:
    | Project[]
    | {
        projects?: Project[];
        items?: Project[];
        records?: Project[];
      };
  projects?: Project[];
  items?: Project[];
  records?: Project[];
};

const STATUS_ORDER = [
  "Not Started",
  "In Progress",
  "Review",
  "Completed",
  "Cancelled",
];

function getProjectsFromResponse(response: ProjectsResponse): Project[] {
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.projects)) return response.projects;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.records)) return response.records;

  if (response.data && !Array.isArray(response.data)) {
    if (Array.isArray(response.data.projects)) return response.data.projects;
    if (Array.isArray(response.data.items)) return response.data.items;
    if (Array.isArray(response.data.records)) return response.data.records;
  }

  return [];
}

function getStatusColor(status: string) {
  if (status === "Completed") return "#10B981";
  if (status === "In Progress") return "#0EA5E9";
  if (status === "Review") return "#F59E0B";
  if (status === "Cancelled") return "#EF4444";
  if (status === "Not Started") return "#64748B";
  return "#8B5CF6";
}

export default function ProjectStatusChart() {
  const theme = useTheme();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProjects() {
      try {
        setError("");

        const response = await apiFetch<ProjectsResponse>("/api/projects");
        setProjects(getProjectsFromResponse(response));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load project status";

        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  const chartData = useMemo(() => {
    const counts = projects.reduce<Record<string, number>>((acc, project) => {
      const status = project.status || "Unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return STATUS_ORDER.map((status) => ({
      name: status,
      value: counts[status] || 0,
      color: getStatusColor(status),
    })).filter((item) => item.value > 0);
  }, [projects]);

  return (
    <Card sx={{ height: "100%", minWidth: 0 }}>
      <CardContent sx={{ p: 2.5, minWidth: 0 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6">Project Status</Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
            Project distribution by current delivery state.
          </Typography>
        </Box>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!loading && error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && chartData.length === 0 && (
          <Typography color="text.secondary">No projects yet.</Typography>
        )}

        {!loading && !error && chartData.length > 0 && (
          <MeasuredChartBox height={330}>
            {({ width, height }) => (
              <Box
                sx={{
                  position: "relative",
                  width,
                  height,
                }}
              >
                <PieChart width={width} height={height}>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={104}
                    paddingAngle={4}
                    labelLine={false}
                    label={({ value }) => value}
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                        stroke={theme.palette.background.paper}
                        strokeWidth={3}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 14,
                      boxShadow:
                        theme.palette.mode === "dark"
                          ? "0 16px 38px rgba(0,0,0,0.36)"
                          : "0 16px 38px rgba(15,23,42,0.12)",
                    }}
                    labelStyle={{
                      color: theme.palette.text.primary,
                      fontWeight: 800,
                    }}
                    itemStyle={{
                      color: theme.palette.text.primary,
                    }}
                  />

                  <Legend
                    wrapperStyle={{
                      color: theme.palette.text.secondary,
                      fontWeight: 700,
                    }}
                  />
                </PieChart>

                <Box
                  sx={{
                    pointerEvents: "none",
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: 112,
                    height: 112,
                    transform: "translate(-50%, -50%)",
                    borderRadius: "50%",
                    boxShadow:
                      theme.palette.mode === "dark"
                        ? `0 0 42px ${alpha(
                            theme.palette.primary.main,
                            0.22
                          )}`
                        : "none",
                  }}
                />
              </Box>
            )}
          </MeasuredChartBox>
        )}
      </CardContent>
    </Card>
  );
}