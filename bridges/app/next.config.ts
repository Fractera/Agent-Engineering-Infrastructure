import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    root: __dirname,
  },
  env: {
    NEXT_PUBLIC_BRIDGE_URL: process.env.NEXT_PUBLIC_BRIDGE_URL ?? "",
    NEXT_PUBLIC_PTY_URL:    process.env.NEXT_PUBLIC_PTY_URL    ?? "",
    NEXT_PUBLIC_AUTH_URL:   process.env.NEXT_PUBLIC_AUTH_URL   ?? "",
    NEXT_PUBLIC_APP_URL:    process.env.NEXT_PUBLIC_APP_URL    ?? "",
    NEXT_PUBLIC_MEDIA_URL:  process.env.NEXT_PUBLIC_MEDIA_URL  ?? "",
  },
  ...(process.env.BASE_PATH
    ? { basePath: process.env.BASE_PATH, trailingSlash: true }
    : { output: "standalone" }),
};

export default config;
