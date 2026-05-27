import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    root: __dirname,
  },
  ...(process.env.BASE_PATH
    ? { basePath: "/admin", trailingSlash: true }
    : { output: "standalone" }),
};

export default config;
