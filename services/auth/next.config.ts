import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  ...(process.env.BASE_PATH
    ? { basePath: process.env.BASE_PATH, trailingSlash: true }
    : { output: "standalone" }),
  allowedDevOrigins: ["auth.partner.fractera.local"],
};

export default nextConfig;
