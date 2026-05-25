import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  output: "standalone",
  allowedDevOrigins: ["auth.partner.fractera.local"],
  ...(process.env.BASE_PATH ? { basePath: process.env.BASE_PATH, trailingSlash: true } : {}),
};

export default nextConfig;
