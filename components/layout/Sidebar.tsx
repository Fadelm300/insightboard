"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
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

function isActivePath(pathname: string, itemPath: string) {
  if (itemPath === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <Drawer
      variant="permanent"
      sx={(theme) => ({
        display: { xs: "none", xl: "block" },
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          display: { xs: "none", xl: "block" },
          width: drawerWidth,
          boxSizing: "border-box",
          borderRight: "1px solid",
          borderColor:
            theme.palette.mode === "dark"
              ? "rgba(148, 163, 184, 0.14)"
              : "rgba(255, 255, 255, 0.42)",
          color: "#F8FAFC",
          background:
            theme.palette.mode === "dark"
              ? "linear-gradient(180deg, #111827 0%, #0F172A 54%, #0B1120 100%)"
              : "linear-gradient(180deg, #1E40AF 0%, #1D4ED8 45%, #0F172A 100%)",
          boxShadow:
            theme.palette.mode === "dark"
              ? "12px 0 36px rgba(0, 0, 0, 0.28)"
              : "12px 0 36px rgba(30, 64, 175, 0.22)",
        },
      })}
    >
      <Toolbar
        sx={{
          minHeight: { xs: 64, xl: 72 },
          px: 2,
          alignItems: "center",
        }}
      >
        <Box>
   <Box
  component={Link}
  href="/"
  sx={{
    display: "flex",
    alignItems: "center",
    textDecoration: "none",
    minWidth: 0,
    flexShrink: 0,
      mt: "7px",
  }}
>
  <Box
    sx={{
      position: "relative",
      width: {
        xs: 150,
        sm: 185,
        md: 220,
      },
      height: {
        xs: 38,
        sm: 46,
        md: 54,
      },
    }}
  >
    <Image
      src="/images/logo/insightboard-logo-1.png"
      alt="InsightBoard Logo"
      fill
      priority
      sizes="(max-width: 600px) 150px, (max-width: 900px) 185px, 220px"
      style={{
        objectFit: "contain",
        objectPosition: "left center",
      }}
    />
  </Box>
</Box>

          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 0.5,
              color: "rgba(248, 250, 252, 0.78)",
              fontWeight: 700,
            }}
          >
            CRM Dashboard
          </Typography>
        </Box>
      </Toolbar>

      <List sx={{ px: 1.25, py: 1 }}>
        {menuItems.map((item) => {
          const selected = isActivePath(pathname, item.path);

          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                href={item.path}
                selected={selected}
                sx={{
                  minHeight: 46,
                  borderRadius: 2,
                  px: 1.5,
                  color: selected ? "#FFFFFF" : "rgba(248, 250, 252, 0.78)",
                  transition:
                    "background-color 180ms ease, color 180ms ease, transform 180ms ease, box-shadow 180ms ease",

                  "& .MuiListItemIcon-root": {
                    minWidth: 36,
                    color: selected ? "#FFFFFF" : "rgba(248, 250, 252, 0.72)",
                  },

                  "& .MuiListItemText-primary": {
                    fontSize: 14,
                    fontWeight: selected ? 800 : 650,
                  },

                  "&.Mui-selected": {
                    bgcolor: "rgba(79, 70, 229, 0.34)",
                    boxShadow: "0 0 22px rgba(59, 130, 246, 0.22)",
                  },

                  "&.Mui-selected:hover": {
                    bgcolor: "rgba(79, 70, 229, 0.42)",
                  },

                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.10)",
                    color: "#FFFFFF",
                    transform: "translateX(2px)",
                  },

                  "&:hover .MuiListItemIcon-root": {
                    color: "#FFFFFF",
                  },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Drawer>
  );
}