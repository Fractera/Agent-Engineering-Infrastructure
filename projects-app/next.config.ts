import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

// Standalone Projects service (step 197). Mirrors bridges/app's process model — launched
// with `next start` (package.json "start" + bootstrap.sh), which auto-loads .env.local (the
// demo-bypass flag FRACTERA_IP_NODOMAIN_MODE + REMOTE_DATA_URL/DATA_API_KEY/LIGHTRAG_* live
// there). NO `output: "standalone"` (incompatible with `next start`, breaks .env.local read)
// and NO basePath: the architecture is subdomain-per-service (projects.<apex>), not path-based
// — Secure mode is handled by nginx + runtime URL derivation, so this config is identical in
// IP and domain mode (one build). `turbopack.root` pins the build root to THIS app so a build
// launched from elsewhere never climbs into a sibling.
//
// withWorkflow wires the Workflow DevKit build transform ("use workflow"/"use step") + the
// internal /.well-known/workflow endpoints — REQUIRED because the durable automations
// (app/api/projects/**/_workflow/definition.ts) run in THIS process (moved here in 197.5).
// Keep it the outermost wrapper (same contract as FNS next.config.ts, 183.B).
const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    root: __dirname,
  },
};

export default withWorkflow(nextConfig);
