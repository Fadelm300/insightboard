import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";

import AppThemeProvider from "@/components/theme/AppThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://insightboard-one.vercel.app"),
  title: "InsightBoard",
  description: "CRM Dashboard for web design business",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppRouterCacheProvider>
          <AppThemeProvider>{children}</AppThemeProvider>
        </AppRouterCacheProvider>

      </body>
    </html>
  );
}
