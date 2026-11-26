import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = process.env.LEGAL_NOTICE_MODE === "review" ? ["/"] : ["/", "/privacy", "/terms"];
  return paths.map((path) => ({
    url: new URL(path, "https://insightboard-one.vercel.app").href,
  }));
}
