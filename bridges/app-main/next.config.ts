import type { NextConfig } from "next";

// Fractera Light admin — always served at /admin via nginx (basePath).
// No standalone output (incompatible with basePath + next start, pattern 11).
// No bridge/PTY env — Light has no AI workspace / WebSocket terminals.
const config: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["better-sqlite3"],
  basePath: "/admin",
  trailingSlash: true,
  turbopack: {
    root: __dirname,
  },
  env: {
    NEXT_PUBLIC_AUTH_URL:  process.env.NEXT_PUBLIC_AUTH_URL  ?? "",
    NEXT_PUBLIC_APP_URL:   process.env.NEXT_PUBLIC_APP_URL   ?? "",
    NEXT_PUBLIC_MEDIA_URL: process.env.NEXT_PUBLIC_MEDIA_URL ?? "",
  },
};

export default config;
