import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/login", "/access-denied", "/server-error", "/cookie-settings"],
    },
    sitemap: "https://insightboard-one.vercel.app/sitemap.xml",
  };
}
