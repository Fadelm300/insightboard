"use client";

import { Card, CardContent, Typography, Box } from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const projectStatusData = [
  { name: "Not Started", value: 3 },
  { name: "In Progress", value: 5 },
  { name: "Review", value: 2 },
  { name: "Completed", value: 7 },
  { name: "Cancelled", value: 1 },
];

const COLORS = ["#90caf9", "#1976d2", "#ffb74d", "#2e7d32", "#d32f2f"];

export default function ProjectStatusChart() {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Project Status
        </Typography>

        <Box sx={{ width: "100%", height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={projectStatusData}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
                label
              >
                {projectStatusData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>

              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}