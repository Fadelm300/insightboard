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
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { apiFetch } from "@/lib/apiClient";

type Project = {
  _id: string;
  name: string;
  status?: string;
};

type ProjectsResponse = {
  success?: boolean;
  message?: string;
  data?: Project[] | { projects?: Project[] };
  projects?: Project[];
};

const STATUS_COLORS = [
  "#1976d2",
  "#ed6c02",
  "#9c27b0",
  "#2e7d32",
  "#d32f2f",
  "#6b7280",
];

const STATUS_ORDER = [
  "Not Started",
  "In Progress",
  "Review",
  "Completed",
  "Cancelled",
];

function getProjectsFromResponse(response: ProjectsResponse): Project[] {
  if (Array.isArray(response.data)) return response.data;

  if (
    response.data &&
    !Array.isArray(response.data) &&
    Array.isArray(response.data.projects)
  ) {
    return response.data.projects;
  }

  if (Array.isArray(response.projects)) return response.projects;

  return [];
}

export default function ProjectStatusChart() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchProjects() {
    setLoading(true);
    setError("");

    try {
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

  useEffect(() => {
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
    })).filter((item) => item.value > 0);
  }, [projects]);

  return (
    <Card sx={{ borderRadius: 3, height: "100%" }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Project Status
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : chartData.length === 0 ? (
          <Typography color="text.secondary">No projects yet.</Typography>
        ) : (
          <Box sx={{ width: "100%", height: 300, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={95}
                  label
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}