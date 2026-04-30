import { ReactNode } from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";

type Tone = "primary" | "info" | "success" | "warning" | "error";

type KPIBoxProps = {
  title: string;
  value: string;
  icon: ReactNode;
  helperText?: string;
  tone?: Tone;
};

function getToneColor(theme: Theme, tone: Tone) {
  if (tone === "info") return theme.palette.info.main;
  if (tone === "success") return theme.palette.success.main;
  if (tone === "warning") return theme.palette.warning.main;
  if (tone === "error") return theme.palette.error.main;
  return theme.palette.primary.main;
}

export default function KPIBox({
  title,
  value,
  icon,
  helperText,
  tone = "primary",
}: KPIBoxProps) {
  const theme = useTheme() as Theme;
  const toneColor = getToneColor(theme, tone);

  return (
    <Card
      sx={{
        height: "100%",
        position: "relative",
        overflow: "hidden",
        transition:
          "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow:
            theme.palette.mode === "dark"
              ? `0 22px 52px rgba(0, 0, 0, 0.38), 0 0 32px ${alpha(
                  toneColor,
                  0.18
                )}`
              : `0 22px 52px ${alpha(theme.palette.grey[900], 0.12)}`,
        },
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at top right, ${alpha(
            toneColor,
            theme.palette.mode === "dark" ? 0.24 : 0.14
          )}, transparent 38%)`,
          pointerEvents: "none",
        },
      }}
    >
      <CardContent
        sx={{
          position: "relative",
          zIndex: 1,
          p: 2.5,
          height: "100%",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 800 }}
            >
              {title}
            </Typography>

            <Typography
              variant="h4"
              sx={{
                mt: 1.2,
                fontWeight: 900,
                letterSpacing: "-0.04em",
                lineHeight: 1.05,
              }}
            >
              {value}
            </Typography>

            {helperText && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1.2, fontWeight: 650 }}
              >
                {helperText}
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              width: 62,
              height: 62,
              flexShrink: 0,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              color: toneColor,
              background: `linear-gradient(145deg, ${alpha(
                toneColor,
                0.2
              )}, ${alpha(toneColor, 0.05)})`,
              border: `1px solid ${alpha(toneColor, 0.28)}`,
              boxShadow:
                theme.palette.mode === "dark"
                  ? `0 0 26px ${alpha(toneColor, 0.24)}`
                  : `0 12px 28px ${alpha(toneColor, 0.18)}`,
              "& svg": {
                fontSize: 34,
              },
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}