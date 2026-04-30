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

const STATUS_COLORS = [
  "#7ea6cd",
  "#eda202",
  "#20c4e5",
  "#27b052",
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

export default function ProjectStatusChart() {
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
    })).filter((item) => item.value > 0);
  }, [projects]);

  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
        height: "100%",
        minWidth: 0,
      }}
    >
      <CardContent sx={{ minWidth: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Project Status
        </Typography>

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
          <Box
            sx={{
              width: "100%",
              height: 300,
              minWidth: 0,
              minHeight: 300,
            }}
          >
            <ResponsiveContainer width="100%" height={300}>
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