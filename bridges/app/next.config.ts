import type { NextConfig } from "next";

// NO `output: "standalone"`. The admin service is launched with `next start`
// (package.json "start" + bootstrap.sh), which auto-loads .env.local — required
// for the demo-bypass flag (FRACTERA_IP_NODOMAIN_MODE) and all runtime secrets.
// `output: standalone` is incompatible with `next start` ("next start does not
// work with output: standalone") and produced a server that never read
// .env.local → 401 / redirect-to-register loops. The standalone server.js also
// doesn't bundle .next/static, so the SPA assets 404. basePath stays
// conditional for the domain (BASE_PATH) case only.
const config: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    root: __dirname,
  },
  ...(process.env.BASE_PATH ? { basePath: "/admin", trailingSlash: true } : {}),
};

export default config;
