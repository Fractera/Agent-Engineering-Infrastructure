import type { ArchNode } from "./types"
import { platform } from "./builders"
import { HERMES_NODE } from "./hermes-node"

// Admin layer — the cockpit (fractera-admin :3002) where work is driven. It
// holds the bridges to the coding agents, the operator tools, Hermes, and the
// domain setup. Reached through auth; never part of the public app.
export const ADMIN_LAYER: ArchNode = {
  id: "admin-layer",
  label: "Admin layer",
  kind: "group",
  description:
    "The cockpit (fractera-admin :3002) where the workspace is driven — the " +
    "bridges to the coding agents, the operator tools, Hermes, and domain setup. " +
    "Reached through auth; not part of the public app.",
  children: [
    {
      id: "bridge",
      label: "Bridges",
      kind: "group",
      description:
        "Keeps the five coding platforms alive over WebSocket and exposes each as " +
        "an MCP server (ports 3210–3214) Hermes can call. The system terminal lives " +
        "here too.",
      children: [
        platform("claude", "Claude Code", "CLAUDE.md"),
        platform("codex", "Codex", "AGENTS.md"),
        platform("gemini", "Gemini CLI", "GEMINI.md"),
        platform("qwen", "Qwen Code", "QWEN.md"),
        platform("kimi", "Kimi Code", "AGENTS.md"),
        {
          id: "system-terminal",
          label: "System terminal",
          kind: "note",
          description:
            "A bare zsh on /opt/fractera, always present as the last carousel card. " +
            "Part of fractera-bridge and not removable.",
        },
      ],
    },
    {
      id: "tools",
      label: "Tools",
      kind: "group",
      description:
        "The footer tools of the workspace. Described here before some of them are " +
        "wired up.",
      children: [
        {
          id: "tool-deploy",
          label: "Deploy",
          kind: "config",
          description:
            "Build loop: POST /api/deploy → async build → pm2 reload. How the AI " +
            "ships code from the workspace to the live app.",
        },
        {
          id: "tool-github",
          label: "GitHub",
          kind: "config",
          description:
            "Connect a repo and pull/push from the workspace (a deploy token is used " +
            "for private repositories).",
        },
        {
          id: "tool-upload",
          label: "Upload Image",
          kind: "config",
          description:
            "Send an image to the media service — used for product assets and PWA " +
            "icon generation.",
        },
        {
          id: "tool-skills",
          label: "Skills",
          kind: "config",
          description:
            "Skills marketplace entry (footer button, not yet active) — where " +
            "reusable agent skills will be browsed and added.",
        },
        {
          id: "tool-product-loop",
          label: "Product Loop",
          kind: "config",
          description:
            "The build journal — every deployment with agent, model, tokens and a " +
            "star rating. Our difference from a generic host (footer button).",
        },
      ],
    },
    {
      id: "service-pages",
      label: "Service Pages",
      kind: "group",
      description:
        "The admin's own control surfaces — architect-only introspection pages at " +
        "/service/* on this cockpit (:3002), NOT part of the public app. They read " +
        "and edit the slot's filesystem through the admin, so they stay alive even " +
        "while the slot itself is rebuilding. Reached from the Service button in " +
        "the admin header — it opens them in a new browser tab. Each is a window " +
        "into the filesystem core that drives the development loop.",
      children: [
        {
          id: "sp-ai-core",
          label: "/service/ai-core — AI Core",
          kind: "page",
          href: "/service/ai-core",
          meta: { roles: "architect", rendering: "dynamic" },
          description:
            "The living map of the workspace's AI body — agents, bridges, memory, MCP, " +
            "tools — as an explorable tree (this very page). It draws the current state by " +
            "request flow so you read it at a glance, in few tokens. Development tie: new " +
            "entities declared here join the build/usage loop — ask Hermes from chat or " +
            "Telegram to pick them up.",
        },
        {
          id: "sp-architecture",
          label: "/service/architecture — Architecture",
          kind: "page",
          href: "/service/architecture",
          meta: { roles: "architect", rendering: "dynamic" },
          description:
            "Interactive map of every route (page + endpoint) of the slot app with its " +
            "roles, rendering and methods, mirrored from the code on disk. Benefit: the " +
            "structure stays legible and drift between code and intent is flagged. " +
            "Development tie: 'Add page' declares a route as a to-do (§3.11) — an agent " +
            "reads it, builds the page, then clears the task.",
        },
        {
          id: "sp-development-steps",
          label: "/service/development-steps — Development steps",
          kind: "page",
          href: "/service/development-steps",
          meta: { roles: "architect", rendering: "dynamic" },
          description:
            "The project work log as real files (DEVELOPMENT-STEPS/): NEW steps are " +
            "editable, COMPLETED are read-only history with a date. Benefit: every agent " +
            "starts a session knowing what was done and what's next. Development tie: this " +
            "IS the step-by-step workflow surfaced in the UI — open a step, an agent builds " +
            "it, then it moves to completed.",
        },
        {
          id: "sp-glossary",
          label: "/service/glossary — Glossary",
          kind: "page",
          href: "/service/glossary",
          meta: { roles: "architect", rendering: "dynamic" },
          description:
            "The shared term map (GLOSSARY.md): approved abbreviations and preferred " +
            "phrasings so every agent reads them the same way (e.g. aws → ai-workspace). " +
            "Benefit: consistent language across agents and sessions. Development tie: read " +
            "as project context on every wake-up — it keeps multi-agent work coherent.",
        },
        {
          id: "sp-documents",
          label: "/service/documents — Documents",
          kind: "page",
          href: "/service/documents",
          meta: { roles: "architect", rendering: "dynamic" },
          description:
            "The knowledge-base file manager (CRUD-DOCS/): create folders, upload " +
            ".txt/.md/.doc/.docx, preview, delete — real files on disk. Activating one " +
            "ingests it into Company Memory (LightRAG). Benefit: your company/process " +
            "knowledge becomes semantically recallable by every agent. Development tie: it " +
            "feeds the memory that grounds every step, cutting back-and-forth.",
        },
        {
          id: "sp-ai-draft-settings",
          label: "/service/ai-draft-settings — AI Draft Settings",
          kind: "page",
          href: "/service/ai-draft-settings",
          meta: { roles: "architect", rendering: "dynamic" },
          description:
            "The draft layer for the six agents' real instruction / skill / MCP files: " +
            "write free-form wishes (supplement / replace); an agent applies them to the " +
            "originals later. Benefit: tune agent behaviour without risking the live files. " +
            "Development tie: a safe staging area between the architect and the files that " +
            "drive each agent.",
        },
        {
          id: "sp-debug",
          label: "/service/debug — Debug",
          kind: "page",
          href: "/service/debug",
          meta: { roles: "architect", rendering: "dynamic" },
          description:
            "Runtime diagnostics: current mode (IP/secure), resolved service URLs, live " +
            "/api/health and /api/me probes. Benefit: quickly see whether the workspace is " +
            "wired correctly. Development tie: a disposable scratch surface for verifying a " +
            "deploy — removable before a public launch.",
        },
      ],
    },
    {
      id: "memory",
      label: "LightRAG — Company Memory",
      kind: "group",
      port: ":9621",
      description:
        "Shared long-term memory for the WHOLE workspace — not just Hermes. fractera-rag " +
        "(LightRAG :9621) holds the knowledge graph; every agent queries it the same way — " +
        "Hermes and the five coding platforms (Claude Code, Codex, Gemini, Qwen, Kimi) — and " +
        "writes back to it. That is why it sits here, beside the Bridges and Tools, not under " +
        "any single agent. The lightrag-memory plugin prefetches relevant pieces and injects " +
        "them as <brain_context>. Needs an embedding/LLM key or it stays wired but silent. Fed " +
        "by the Documentation corpus.",
      children: [
        {
          id: "memory-store",
          label: "Company Memory store (LightRAG)",
          kind: "config",
          description:
            "The knowledge-graph store fractera-rag keeps on disk — entities, relations and " +
            "embeddings built from the Documentation corpus. Any agent recalls from it " +
            "semantically; ingest a document once and every agent can use it.",
        },
      ],
    },
    HERMES_NODE,
    {
      id: "domain",
      label: "Domain settings",
      kind: "group",
      description:
        "Attach your own domain and HTTPS — the optional step that turns IP mode " +
        "into secure mode.",
      children: [
        {
          id: "domain-connect",
          label: "Domain connection",
          kind: "config",
          description:
            "Point a custom domain at the server; the wizard validates DNS and stages " +
            "the nginx config.",
        },
        {
          id: "domain-cert",
          label: "Certificate connection",
          kind: "group",
          description: "The HTTPS certificate for your domain.",
          children: [
            {
              id: "cert-auto",
              label: "Automatic certificate",
              kind: "config",
              description:
                "Issued automatically on the server (Let's Encrypt / certbot) — no " +
                "manual steps.",
            },
            {
              id: "cert-custom",
              label: "Custom certificate",
              kind: "config",
              description:
                "Bring your own certificate when you manage TLS elsewhere.",
            },
          ],
        },
      ],
    },
  ],
}
