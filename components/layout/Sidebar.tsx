"use client";

import { useId, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Box,
  Drawer,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import HandshakeIcon from "@mui/icons-material/Handshake";
import WorkIcon from "@mui/icons-material/Work";
import PaymentsIcon from "@mui/icons-material/Payments";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AssessmentIcon from "@mui/icons-material/Assessment";
import SettingsIcon from "@mui/icons-material/Settings";

import { usePermissions } from "@/components/access/PermissionProvider";
import { PAGE_PERMISSIONS } from "@/lib/permissions";

const drawerWidth = 240;

const sections = ["Workspace", "Finance", "Archives", "Administration"];

const menuItems = [
  { text: "Users", section: "Administration", icon: <PeopleIcon />, path: "/dashboard/users" },
  { text: "Dashboard", section: null, icon: <DashboardIcon />, path: "/dashboard" },
  { text: "Clients", section: "Workspace", icon: <PeopleIcon />, path: "/dashboard/clients" },
  { text: "Deals", section: "Workspace", icon: <HandshakeIcon />, path: "/dashboard/deals" },
  { text: "Projects", section: "Workspace", icon: <WorkIcon />, path: "/dashboard/projects" },
  { text: "Revenue", section: "Finance", icon: <PaymentsIcon />, path: "/dashboard/revenue" },
  { text: "Expenses", section: "Finance", icon: <ReceiptLongIcon />, path: "/dashboard/expenses" },
  { text: "Reports", section: "Finance", icon: <AssessmentIcon />, path: "/dashboard/reports" },
  { text: "Financial Archive", section: "Archives", icon: <AssessmentIcon />, path: "/dashboard/financial-archive" },
  { text: "CRM Archive", section: "Archives", icon: <AssessmentIcon />, path: "/dashboard/crm-archive" },
  { text: "Archive Requests", section: "Archives", icon: <AssessmentIcon />,   path: "/dashboard/archive-requests" },
  { text: "Settings", section: null, icon: <SettingsIcon />, path: "/dashboard/settings" },
];

function isActivePath(pathname: string, itemPath: string) {
  if (itemPath === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export default function Sidebar() {
  const pathname = usePathname();
  const permissions = usePermissions();
  const sectionId = useId();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const visibleMenuItems = menuItems.filter((item) => permissions.includes(PAGE_PERMISSIONS[item.path as keyof typeof PAGE_PERMISSIONS]));

  function renderItem(item: (typeof menuItems)[number]) {
    const selected = isActivePath(pathname, item.path);

    return (
      <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
        <ListItemButton
          component={Link}
          href={item.path}
          prefetch={false}
          selected={selected}
          aria-current={selected ? "page" : undefined}
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
  }

  return (
    <Drawer
      variant="permanent"
      sx={(theme) => ({
        display: { xs: "none", xl: "block" },
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          borderRight: "1px solid",
          borderColor:
            theme.palette.mode === "dark"
              ? "rgba(148, 163, 184, 0.14)"
              : "rgba(255, 255, 255, 0.42)",
          display: { xs: "none", xl: "flex" },
          flexDirection: "column",
          overflow: "hidden",
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

      <Box component="nav" aria-label="Dashboard navigation" sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <List sx={{ px: 1.25, py: 1, flex: 1, minHeight: 0, overflowY: "auto" }}>
          {visibleMenuItems.filter((item) => item.path === "/dashboard").map(renderItem)}
          {sections.map((section, index) => {
            const items = visibleMenuItems.filter((item) => item.section === section);
            if (!items.length) return null;

            const open = expanded[section] ?? (section === "Workspace" || items.some((item) => isActivePath(pathname, item.path)));
            const id = `${sectionId}-${index}`;

            return (
              <ListItem key={section} disablePadding sx={{ display: "block", mb: 0.5 }}>
                <ListItemButton
                  component="button"
                  type="button"
                  aria-expanded={open}
                  aria-controls={id}
                  onClick={() => setExpanded((current) => ({ ...current, [section]: !open }))}
                  sx={{ width: "100%", px: 1.5, borderRadius: 2, color: "inherit" }}
                >
                  <ListItemText primary={section} />
                  <ExpandMoreIcon fontSize="small" sx={{ transform: open ? "rotate(180deg)" : "none" }} />
                </ListItemButton>
                <Collapse in={open} id={id}>
                  <List disablePadding sx={{ pl: 1.5 }}>
                    {items.map(renderItem)}
                  </List>
                </Collapse>
              </ListItem>
            );
          })}
        </List>
        <List sx={{ px: 1.25, py: 1, flexShrink: 0 }}>
          {visibleMenuItems.filter((item) => item.path === "/dashboard/settings").map(renderItem)}
        </List>
      </Box>
    </Drawer>
  );
}
