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
