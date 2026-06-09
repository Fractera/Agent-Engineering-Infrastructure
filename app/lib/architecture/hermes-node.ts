import type { ArchNode } from "./types"
import { skillsGroup, skill, mcp } from "./builders"

// Hermes (Brain) subtree. Hermes is a folder holding the agent itself plus the
// two front doors a human reaches it through (Web UI, Telegram). The agent's
// internals — identity, memory and the seven MCP bridges — nest under it.
export const HERMES_NODE: ArchNode = {
  id: "hermes",
  label: "Hermes",
  kind: "group",
  description:
    "The brain plus the two ways a human reaches it. The agent orchestrates " +
    "development across the platforms; the Web UI and Telegram are its front doors.",
  children: [
    {
      id: "hermes-agent",
      label: "Hermes Agent — Brain",
      kind: "service",
      port: ":9119",
      description:
        "The orchestration agent. It reads its identity and memory at every " +
        "wake-up and drives the five coding platforms through the bridges.",
      children: [
        {
          id: "hermes-config",
          label: "config.yaml — wiring",
          kind: "config",
          description:
            "Says what Hermes can reach: model/provider, memory provider, plugins " +
            "and the MCP servers. Wiring, not rules — where he can reach, not who he is.",
        },
        {
          id: "hermes-soul",
          label: "SOUL.md — identity",
          kind: "config",
          description:
            "Optional personality file read on every turn. When present it replaces " +
            "the default identity — this is where 'you are the brain of Fractera, you " +
            "orchestrate development' belongs.",
        },
        skillsGroup("hermes-skills", [
          skill("delegate-task", "delegate-task"),
          skill("record-deployment", "record-deployment"),
          skill("choose-agent", "choose-agent"),
        ]),
        {
          id: "hermes-memory",
          label: "Memory — Company Brain (LightRAG :9621)",
          kind: "group",
          description:
            "Hermes's long-term memory. fractera-rag (:9621) holds the knowledge " +
            "graph; the lightrag-memory plugin prefetches relevant pieces and injects " +
            "them as <brain_context>. Needs an embedding/LLM key or it stays wired but " +
            "silent. Fed by the Documentation corpus.",
        },
        {
          id: "hermes-mcp",
          label: "MCP servers — 7 bridges",
          kind: "group",
          description:
            "The bridges exposed to Hermes as callable tools over loopback JSON-RPC " +
            "(ports 3210–3216). They show up at start-up — which is why Hermes sees " +
            "his tools even before his memory or role.",
          children: [
            mcp("mcp-claude", "claude-bridge :3210"),
            mcp("mcp-codex", "codex-bridge :3211"),
            mcp("mcp-gemini", "gemini-bridge :3212"),
            mcp("mcp-qwen", "qwen-bridge :3213"),
            mcp("mcp-kimi", "kimi-bridge :3214"),
            {
              id: "mcp-deployments",
              label: "deployments-bridge :3215",
              kind: "mcp",
              description:
                "Product Loop journal + projects in app.db. Tools: record_deployment, " +
                "list_deployments, update_deployment, describe_record, create_project, " +
                "list_projects. No delete by design — history is never lost via MCP.",
            },
            {
              id: "mcp-readiness",
              label: "readiness-bridge :3216",
              kind: "mcp",
              description:
                "One snapshot of all five coding agents before delegating: installed, " +
                "logged_in, busy, last_worked. Tool: check_agents_readiness. Read-only " +
                "— facts only; the choose-agent skill decides.",
            },
          ],
        },
      ],
    },
    {
      id: "hermes-webui",
      label: "Chat Web UI — fractera-hermes-webui",
      kind: "service",
      port: ":9120",
      description:
        "The chat window inside your workspace where you talk to Hermes in plain " +
        "language. Benefit: you brief the brain like a teammate and it drives the " +
        "five coding platforms for you — no commands to memorise.",
    },
    {
      id: "hermes-telegram",
      label: "Telegram — fractera-hermes-gateway",
      kind: "service",
      description:
        "A gateway process that lets you reach the same brain from Telegram on your " +
        "phone. Benefit: start, check on, or steer work away from the keyboard; the " +
        "workspace keeps building while you are out.",
    },
  ],
}
