import type { Metadata } from "next";
import { cookies } from "next/headers";
import Landing from "@/components/landing/Landing";
import { ANALYTICS_PREFERENCE } from "@/components/landing/analyticsConsent";
import { landingFontClasses } from "@/components/landing/landingFonts";
import "./landing.css";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const preferences = await cookies();

  const language =
    preferences.get("language")?.value === "ar" ? "ar" : "en";

  const theme =
    preferences.get("theme")?.value === "dark" ? "dark" : "light";

  const analyticsChoice = preferences.get(ANALYTICS_PREFERENCE)?.value;

  return <Landing
    initialLanguage={language}
    initialTheme={theme}
    showInitialCookieBanner={analyticsChoice !== "allowed" && analyticsChoice !== "necessary"}
    fontClasses={landingFontClasses}
  />;
}
