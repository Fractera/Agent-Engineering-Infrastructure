import type { ArchNode } from "./types"
import { ADMIN_LAYER } from "./admin-node"
import { DOCS_NODE } from "./docs-node"

// Seed catalogue of the L2 architecture, drawn the way a request actually flows:
// everything reachable sits behind nginx and the auth gate, then splits into the
// app, data and admin layers. Nesting expresses "what a request passes through /
// what is gated by what" — a logical lens, NOT which process runs inside another.
// Pure data (CLAUDE.md §12 exemption) — kept whole except for the two large
// subtrees (admin, docs) that live in their own modules.

export const ARCHITECTURE_TREE: ArchNode = {
  id: "l2",
  label: "Fractera workspace",
  kind: "layer",
  description:
    "Your AI coding workspace, drawn the way a request flows: everything " +
    "reachable sits behind nginx and the auth gate. This is the secure-mode " +
    "lens — in IP mode there is no nginx gate and services are reached by port. " +
    "Nesting shows what a request passes through / what is gated by what, not " +
    "which process runs inside another.",
  children: [
    {
      id: "nginx",
      label: "nginx — front door",
      kind: "service",
      port: ":80/:443",
      description:
        "The reverse proxy every visible request passes through in secure mode: " +
        "it terminates TLS, routes the apex and the admin./auth./data./chat. " +
        "subdomains, runs the auth_request gate, and injects the 'Powered by " +
        "Fractera' footer. In IP mode it is absent — you reach services by port.",
      children: [
        {
          id: "auth",
          label: "Authorization — fractera-auth",
          kind: "service",
          port: ":3001",
          description:
            "The gate every protected request crosses (NextAuth: login, register, " +
            "guest, roles). It covers the rest of the workspace — which is why it " +
            "sits above the app, data and admin layers here. Logical coverage, not " +
            "a process that runs them. In IP mode the gate is bypassed for onboarding.",
          children: [
            {
              id: "app-layer",
              label: "App layer",
              kind: "group",
              description:
                "The product itself — the public app the AI builds and ships.",
              children: [
                {
                  id: "app",
                  label: "fractera-app — App Shell",
                  kind: "service",
                  port: ":3000",
                  description:
                    "The public-facing application at your domain root. This very " +
                    "page lives here. Open layer — the AI writes code here; safe to edit.",
                },
              ],
            },
            {
              id: "data-layer",
              label: "Data layer",
              kind: "group",
              description:
                "Where the workspace keeps state. Powered by fractera-data (:3300), " +
                "a token-authenticated service in front of SQLite and media.",
              children: [
                {
                  id: "data-db",
                  label: "Database — SQLite",
                  kind: "group",
                  description:
                    "app.db + media.db. New tables are declared once in the SCHEMA " +
                    "and appear in every environment automatically.",
                  children: [
                    { id: "tbl-products", label: "products", kind: "config",
                      description: "Catalogue demo rows behind the Dashboard page." },
                    { id: "tbl-deployments", label: "deployment_records", kind: "config",
                      description: "Product Loop journal — every build with agent, model, tokens, step and rating (16 fields)." },
                    { id: "tbl-projects", label: "projects", kind: "config",
                      description: "Named projects that deployments are grouped under (default-first)." },
                    { id: "tbl-settings", label: "site_settings", kind: "config",
                      description: "Workspace settings — domain, certificate countdown, white-label flag." },
                  ],
                },
                {
                  id: "data-media",
                  label: "Object Storage / Media",
                  kind: "service",
                  description:
                    "The media side of fractera-data: uploads, thumbnails, image " +
                    "cropping and PWA icon generation from one square image.",
                },
              ],
            },
            ADMIN_LAYER,
          ],
        },
      ],
    },
    DOCS_NODE,
  ],
}
