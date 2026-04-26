"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Box,
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import HandshakeIcon from "@mui/icons-material/Handshake";
import WorkIcon from "@mui/icons-material/Work";
import PaymentsIcon from "@mui/icons-material/Payments";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AssessmentIcon from "@mui/icons-material/Assessment";
import SettingsIcon from "@mui/icons-material/Settings";

const drawerWidth = 240;

const menuItems = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
  { text: "Clients", icon: <PeopleIcon />, path: "/dashboard/clients" },
  { text: "Deals", icon: <HandshakeIcon />, path: "/dashboard/deals" },
  { text: "Projects", icon: <WorkIcon />, path: "/dashboard/projects" },
  { text: "Revenue", icon: <PaymentsIcon />, path: "/dashboard/revenue" },
  { text: "Expenses", icon: <ReceiptLongIcon />, path: "/dashboard/expenses" },
  { text: "Reports", icon: <AssessmentIcon />, path: "/dashboard/reports" },
  { text: "Settings", icon: <SettingsIcon />, path: "/dashboard/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
        },
      }}
    >
      <Toolbar>
        <Box>
<Typography variant="h6" sx={{ fontWeight: 700 }}>
              InsightBoard
            </Typography>
            <Typography variant="caption" color="text.secondary">
              CRM Dashboard
            </Typography>
          </Box>
      </Toolbar>

      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              component={Link}
              href={item.path}
              selected={pathname === item.path}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}