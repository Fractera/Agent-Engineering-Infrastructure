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
        "subdomains, and runs the auth_request gate. In IP mode it is absent — " +
        "you reach services by port directly.",
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
                  children: [
                    {
                      id: "service-pages",
                      label: "Service Pages",
                      kind: "group",
                      description:
                        "The Shell's own control surfaces — admin-only introspection pages, not " +
                        "end-user pages. They were removed from the public home (which now shows only " +
                        "Start Coding + Dashboard) and are reached from the Service pages menu in the " +
                        "admin App Preview. Each is private (admin role) and dynamically rendered, and " +
                        "each is a window into the filesystem core that drives the development loop.",
                      children: [
                        {
                          id: "sp-ai-core",
                          label: "/ai-core — AI Core",
                          kind: "page",
                          href: "/ai-core",
                          meta: { roles: "admin", rendering: "dynamic" },
                          description:
                            "The living map of the workspace's AI body — agents, bridges, memory, MCP, " +
                            "tools — as an explorable tree (this very page). It draws the current state by " +
                            "request flow so you read it at a glance, in few tokens. Development tie: new " +
                            "entities declared here join the build/usage loop — ask Hermes from chat or " +
                            "Telegram to pick them up.",
                        },
                        {
                          id: "sp-architecture",
                          label: "/architecture — Architecture",
                          kind: "page",
                          href: "/architecture",
                          meta: { roles: "admin", rendering: "dynamic" },
                          description:
                            "Interactive map of every route (page + endpoint) with its roles, rendering " +
                            "and methods, mirrored from the code on disk. Benefit: the structure stays " +
                            "legible and drift between code and intent is flagged. Development tie: 'Add " +
                            "page' declares a route as a to-do (§3.11) — an agent reads it, builds the " +
                            "page, then clears the task.",
                        },
                        {
                          id: "sp-development-steps",
                          label: "/development-steps — Development steps",
                          kind: "page",
                          href: "/development-steps",
                          meta: { roles: "admin", rendering: "dynamic" },
                          description:
                            "The project work log as real files (DEVELOPMENT-STEPS/): NEW steps are " +
                            "editable, COMPLETED are read-only history with a date. Benefit: every agent " +
                            "starts a session knowing what was done and what's next. Development tie: this " +
                            "IS the step-by-step workflow surfaced in the UI — open a step, an agent builds " +
                            "it, then it moves to completed.",
                        },
                        {
                          id: "sp-patterns",
                          label: "/patterns — Patterns & Anti-patterns",
                          kind: "page",
                          href: "/patterns",
                          meta: { roles: "admin", rendering: "dynamic" },
                          description:
                            "The reuse library: code Patterns (by category) the AI reuses while building, " +
                            "and Anti-patterns it reads before every deploy. Benefit: less re-derivation, " +
                            "fewer repeated mistakes, lower token spend. Development tie: declaring a pattern " +
                            "requests it; an agent fills it in, and later steps reuse it instead of rebuilding.",
                        },
                        {
                          id: "sp-glossary",
                          label: "/glossary — Glossary",
                          kind: "page",
                          href: "/glossary",
                          meta: { roles: "admin", rendering: "dynamic" },
                          description:
                            "The shared term map (GLOSSARY.md): approved abbreviations and preferred " +
                            "phrasings so every agent reads them the same way (e.g. aws → ai-workspace). " +
                            "Benefit: consistent language across agents and sessions. Development tie: read " +
                            "as project context on every wake-up — it keeps multi-agent work coherent.",
                        },
                        {
                          id: "sp-documents",
                          label: "/documents — Documents",
                          kind: "page",
                          href: "/documents",
                          meta: { roles: "admin", rendering: "dynamic" },
                          description:
                            "The knowledge-base file manager (CRUD-DOCS/): create folders, upload " +
                            ".txt/.md/.doc/.docx, preview, delete — real files on disk. Activating one " +
                            "ingests it into Company Memory (LightRAG). Benefit: your company/process " +
                            "knowledge becomes semantically recallable by every agent. Development tie: it " +
                            "feeds the memory that grounds every step, cutting back-and-forth.",
                        },
                        {
                          id: "sp-ai-draft-settings",
                          label: "/ai-draft-settings — AI Draft Settings",
                          kind: "page",
                          href: "/ai-draft-settings",
                          meta: { roles: "admin", rendering: "dynamic" },
                          description:
                            "The draft layer for the six agents' real instruction / skill / MCP files: " +
                            "write free-form wishes (supplement / replace); an agent applies them to the " +
                            "originals later. Benefit: tune agent behaviour without risking the live files. " +
                            "Development tie: a safe staging area between the architect and the files that " +
                            "drive each agent.",
                        },
                        {
                          id: "sp-debug",
                          label: "/debug — Debug",
                          kind: "page",
                          href: "/debug",
                          meta: { roles: "admin", rendering: "dynamic" },
                          description:
                            "Runtime diagnostics: current mode (IP/secure), resolved service URLs, live " +
                            "/api/health and /api/me probes. Benefit: quickly see whether the workspace is " +
                            "wired correctly. Development tie: a disposable scratch surface for verifying a " +
                            "deploy — removable before a public launch.",
                        },
                      ],
                    },
                  ],
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
                      description: "Workspace settings — domain and certificate state." },
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
