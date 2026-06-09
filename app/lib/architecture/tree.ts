import type { ArchNode } from "./types"
import { platform } from "./builders"
import { HERMES_NODE } from "./hermes-node"
import { DOCS_NODE } from "./docs-node"

// Seed catalogue of the L2 (Fractera-on-VPS) architecture. This is the single
// source the Architecture page renders — left tree + right detail panel both
// read it. Hand-curated for v1; the intent is to later auto-generate it from
// the live config (config.yaml, installed-components.json, the file system) so
// it stays a faithful, low-token snapshot both the human and the AI can read.

export const ARCHITECTURE_TREE: ArchNode = {
  id: "l2",
  label: "Fractera workspace (L2)",
  kind: "layer",
  description:
    "The open layer that runs on your own VPS at /opt/fractera. Seven PM2 " +
    "processes cooperate to give you a production AI coding workspace: a public " +
    "app shell, auth, the admin cockpit, the platform bridges, data, memory and " +
    "the Hermes brain. Click any node to see what it is and how it connects.",
  children: [
    {
      id: "app",
      label: "fractera-app — App Shell",
      kind: "service",
      port: ":3000",
      description:
        "The public-facing application served at your domain root. This very " +
        "page lives here. It is the starter template you turn into your own " +
        "product; the AI writes code here. Open layer — safe to edit.",
    },
    {
      id: "auth",
      label: "fractera-auth — Auth",
      kind: "service",
      port: ":3001",
      description:
        "NextAuth-based identity: login, register, guest and role-based access. " +
        "In IP mode auth is bypassed for onboarding; with a custom domain it " +
        "enforces strict role checks.",
    },
    {
      id: "admin",
      label: "fractera-admin — Admin / Bridges cockpit",
      kind: "service",
      port: ":3002",
      description:
        "The admin workspace (Start Coding) where you drive the AI platforms, " +
        "Brain, Memory, deployments and settings. Not part of the public app.",
    },
    {
      id: "bridge",
      label: "fractera-bridge — Platform bridges",
      kind: "service",
      port: ":3200–3206",
      description:
        "Keeps the five AI coding platforms alive over WebSocket and exposes " +
        "each as an MCP server (ports 3210–3214) that Hermes can call. The " +
        "last carousel card — the system terminal — also lives here.",
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
            "A bare zsh on /opt/fractera, always present as the last carousel " +
            "card. Part of fractera-bridge and not removable.",
        },
      ],
    },
    {
      id: "data",
      label: "fractera-data — Data service",
      kind: "service",
      port: ":3300",
      description:
        "Token-authenticated SQLite data API plus media: uploads, thumbnails, " +
        "image cropping and PWA icon generation. The app talks to it over HTTP.",
      children: [
        {
          id: "data-db",
          label: "Database — SQLite",
          kind: "group",
          description:
            "The app's SQLite store (app.db + media.db). New tables are declared " +
            "once in the SCHEMA and appear in every environment automatically.",
          children: [
            { id: "tbl-products", label: "products", kind: "config",
              description: "Catalogue demo rows behind the Dashboard page." },
            { id: "tbl-deployments", label: "deployment_records", kind: "config",
              description: "Product Loop journal — every build with agent, model, tokens, step and star rating (16 fields)." },
            { id: "tbl-projects", label: "projects", kind: "config",
              description: "Named projects that deployments are grouped under (default-first)." },
            { id: "tbl-settings", label: "site_settings", kind: "config",
              description: "Workspace settings — domain, certificate countdown, white-label flag." },
          ],
        },
      ],
    },
    {
      id: "rag",
      label: "fractera-rag — Memory (LightRAG)",
      kind: "service",
      port: ":9621",
      description:
        "Company Brain knowledge graph. Hermes prefetches relevant memory from " +
        "here and injects it as <brain_context>. Needs an embedding/LLM key to " +
        "actually index and answer — without it, memory is wired but silent.",
    },
    HERMES_NODE,
    {
      id: "nginx",
      label: "Nginx — reverse proxy",
      kind: "service",
      port: ":80/:443",
      description:
        "Not a PM2 process but the front door in secure mode: routes the apex to " +
        "the app and the admin./auth./data./chat. subdomains to their services, " +
        "gates protected areas via auth_request, and injects the 'Powered by " +
        "Fractera' footer. In IP mode you reach services by port directly.",
    },
    DOCS_NODE,
  ],
}
