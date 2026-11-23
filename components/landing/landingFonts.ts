import { DM_Sans, DM_Serif_Display, Noto_Sans_Arabic } from "next/font/google";

const sans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--ib-font-sans",
  display: "swap",
});

const serif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--ib-font-serif",
  display: "swap",
});

const arabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--ib-font-arabic",
  display: "swap",
});

export const landingFontClasses = `${sans.variable} ${serif.variable} ${arabic.variable}`;
