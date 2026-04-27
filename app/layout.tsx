import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import "./globals.css";

export const metadata: Metadata = {
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
          {children}
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}

//suppressHydrationWarning is used to prevent hydration mismatch warnings in Next.js when the server-rendered HTML does not match the client-rendered HTML. This can happen when using certain client-side libraries or when there are differences in rendering between the server and client. By adding this attribute, you can avoid these warnings and ensure a smoother user experience.
//In this case, it is likely used to prevent warnings related to the Material-UI components that may render differently on the server and client.