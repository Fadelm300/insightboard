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
import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";

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

  const totalProjects = chartData.reduce((total, item) => total + item.value, 0);

  return (
    <Card
      sx={{
        height: "100%",
        minWidth: 0,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            theme.palette.mode === "dark"
              ? `radial-gradient(circle at 18% 14%, ${alpha(
                  theme.palette.primary.main,
                  0.14
                )}, transparent 36%),
                 radial-gradient(circle at 86% 18%, ${alpha(
                   theme.palette.success.main,
                   0.1
                 )}, transparent 34%)`
              : `radial-gradient(circle at 18% 14%, ${alpha(
                  theme.palette.primary.main,
                  0.08
                )}, transparent 36%),
                 radial-gradient(circle at 86% 18%, ${alpha(
                   theme.palette.success.main,
                   0.08
                 )}, transparent 34%)`,
        }}
      />

      <CardContent
        sx={{
          position: "relative",
          p: { xs: 2, md: 2.5 },
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            mb: 2.5,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 1.5,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 900,
                letterSpacing: "-0.03em",
              }}
            >
              Project Status
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
              Project distribution by current delivery state.
            </Typography>
          </Box>

          {!loading && !error && chartData.length > 0 && (
            <Box
              sx={{
                px: 1.4,
                py: 0.75,
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 900,
                color: "primary.light",
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
                boxShadow:
                  theme.palette.mode === "dark"
                    ? `0 0 24px ${alpha(theme.palette.primary.main, 0.16)}`
                    : `0 10px 26px ${alpha(theme.palette.primary.main, 0.1)}`,
              }}
            >
              {totalProjects} Projects
            </Box>
          )}
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
                  <defs>
                    <filter
                      id="projectStatusGlow"
                      x="-25%"
                      y="-25%"
                      width="150%"
                      height="150%"
                    >
                      <feGaussianBlur stdDeviation="3.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    <filter
                      id="projectStatusShadow"
                      x="-30%"
                      y="-30%"
                      width="160%"
                      height="160%"
                    >
                      <feDropShadow
                        dx="0"
                        dy="10"
                        stdDeviation="8"
                        floodColor={alpha(theme.palette.common.black, 0.34)}
                      />
                    </filter>
                  </defs>

                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={66}
                    outerRadius={108}
                    paddingAngle={5}
                    labelLine={false}
                    label={({ value }) => value}
                    filter="url(#projectStatusShadow)"
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                        stroke={theme.palette.background.paper}
                        strokeWidth={4}
                      />
                    ))}
                  </Pie>

                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={112}
                    outerRadius={116}
                    paddingAngle={5}
                    labelLine={false}
                    legendType="none"
                    isAnimationActive={false}
                    filter="url(#projectStatusGlow)"
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={`glow-${entry.name}`}
                        fill={alpha(entry.color, 0.24)}
                        stroke="none"
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
                      fontWeight: 900,
                    }}
                    itemStyle={{
                      color: theme.palette.text.primary,
                      fontWeight: 700,
                    }}
                  />

                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{
                      color: theme.palette.text.secondary,
                      fontWeight: 800,
                      paddingTop: 14,
                    }}
                  />
                </PieChart>

                <Box
                  sx={{
                    pointerEvents: "none",
                    position: "absolute",
                    // Center circle vertical position:
                    // xs/sm/md = phone/tablet/normal desktop
                    // lg = laptop 13/14 inch adjustment
                    // xl = large desktop
                      top: {sm: "44%", xs: "37%", md: "44%", lg: "37%", xl: "39%" },

                      "@media (min-width: 1800px)": {
                        top: "40%",
                      }, 
                      "@media (max-width: 430px) and (min-height: 900px)": {
                              top: "40%",
                            },
                                         left: "50%",
                    width: 116,
                    height: 116,
                    transform: "translate(-50%, -50%)",
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? alpha(theme.palette.background.paper, 0.52)
                        : alpha(theme.palette.background.paper, 0.82),
                    border: `1px solid ${alpha(theme.palette.divider, 0.72)}`,
                    boxShadow:
                      theme.palette.mode === "dark"
                        ? `inset 0 1px 0 ${alpha(
                            theme.palette.common.white,
                            0.08
                          )}, 0 0 42px ${alpha(
                            theme.palette.primary.main,
                            0.22
                          )}`
                        : `inset 0 1px 0 ${alpha(
                            theme.palette.common.white,
                            0.95
                          )}, 0 18px 34px ${alpha(
                            theme.palette.primary.main,
                            0.12
                          )}`,
                  }}
                >
                  <Box sx={{ textAlign: "center" }}>
                    <Typography
                      sx={{
                        fontSize: 26,
                        fontWeight: 950,
                        lineHeight: 1,
                        letterSpacing: "-0.05em",
                      }}
                    >
                      {totalProjects}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.35,
                        fontSize: 11,
                        fontWeight: 800,
                        color: "text.secondary",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Total
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </MeasuredChartBox>
        )}
      </CardContent>
    </Card>
  );
}
