import type { NextConfig } from "next";

// Standalone Design service (step 197) — a real-but-empty sibling of the Projects service, stood
// up now so the design layer is developed later on its OWN process (never bundled into admin).
// Same process model as bridges/app & projects-app: `next start` (auto-loads .env.local), NO
// `output: standalone`, NO basePath (subdomain-per-service: design.<apex>). No withWorkflow yet —
// this app carries no durable automations; add it if/when the design layer needs workflows.
const config: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
};

export default config;
