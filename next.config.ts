import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  ...(process.env.CONTAINER_BUILD === "1" ? { output: "standalone" } : {}),
};

export default nextConfig;