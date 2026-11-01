import { cookies } from "next/headers";
import { DM_Sans, DM_Serif_Display, Noto_Sans_Arabic } from "next/font/google";
import Landing from "@/components/landing/Landing";
import "./landing.css";

const sans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--ib-font-sans",
  display: "swap"
});

const serif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--ib-font-serif",
  display: "swap"
});

const arabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--ib-font-arabic",
  display: "swap"
});

export default async function Home() {
  const preferences = await cookies();

  const language =
    preferences.get("language")?.value === "ar" ? "ar" : "en";

  const theme =
    preferences.get("theme")?.value === "dark" ? "dark" : "light";

  return <Landing
    initialLanguage={language}
    initialTheme={theme}
    fontClasses={
      sans.variable + " " + serif.variable + " " + arabic.variable
    }
  />;
}