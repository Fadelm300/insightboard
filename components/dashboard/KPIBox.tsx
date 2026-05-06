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
        minHeight: { xs: 148, sm: 156, lg: 164 },
        minWidth: 0,
        position: "relative",
        overflow: "hidden",
        borderRadius: 2,
        transition:
          "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
        "&:hover": {
          transform: { xs: "none", md: "translateY(-3px)" },
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
        "&::after": {
          content: '""',
          position: "absolute",
          left: 18,
          right: 18,
          bottom: 12,
          height: 18,
          borderRadius: "50%",
          background:
            theme.palette.mode === "dark"
              ? alpha(theme.palette.common.black, 0.2)
              : alpha(toneColor, 0.08),
          filter: "blur(16px)",
          transform: "perspective(700px) rotateX(58deg)",
          pointerEvents: "none",
        },
      }}
    >
      <CardContent
        sx={{
          position: "relative",
          zIndex: 1,
          p: { xs: 2, sm: 2.25, md: 2.5 },
          height: "100%",
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            height: "100%",
            minWidth: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: { xs: 1.5, md: 2 },
          }}
        >
          <Box
            sx={{
              minWidth: 0,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              height: "100%",
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: 12.5, sm: 13, md: 14 },
                  lineHeight: 1.25,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {title}
              </Typography>

              <Typography
                variant="h4"
                sx={{
                  mt: { xs: 1, md: 1.2 },
                  fontWeight: 950,
                  letterSpacing: "-0.05em",
                  lineHeight: 1.05,
                  fontSize: {
                    xs: value.length > 12 ? 24 : 30,
                    sm: value.length > 12 ? 25 : 32,
                    md: value.length > 12 ? 24 : 32,
                    lg: value.length > 12 ? 23 : 31,
                    xl: value.length > 12 ? 26 : 34,
                  },
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={value}
              >
                {value}
              </Typography>
            </Box>

            {helperText && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: { xs: 1.1, md: 1.2 },
                  fontWeight: 750,
                  fontSize: { xs: 12, md: 13 },
                  lineHeight: 1.3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={helperText}
              >
                {helperText}
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              width: { xs: 48, sm: 54, md: 58, xl: 62 },
              height: { xs: 48, sm: 54, md: 58, xl: 62 },
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
                fontSize: { xs: 26, sm: 29, md: 31, xl: 34 },
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
