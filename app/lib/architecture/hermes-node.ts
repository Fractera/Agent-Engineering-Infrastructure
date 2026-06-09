import type { ArchNode } from "./types"
import { skillsGroup, skill, mcp } from "./builders"

// The Hermes (Brain) subtree — its own module because it is the largest node:
// identity, memory, skills and the seven MCP bridges it drives, plus the two
// interfaces a human reaches it through (Web UI, Telegram).
export const HERMES_NODE: ArchNode = {
  id: "hermes",
  label: "fractera-hermes — Brain (Hermes)",
  kind: "service",
  port: ":9119",
  description:
    "The orchestration agent. It coordinates multi-step work across the five " +
    "platforms, reads its memory and its identity at every wake-up, and can be " +
    "reached from Telegram via the gateway process.",
  children: [
    {
      id: "hermes-config",
      label: "config.yaml — wiring",
      kind: "config",
      description:
        "Says what Hermes can reach: model/provider, memory provider, plugins, " +
        "and the MCP servers. Wiring, not rules — it lists where he can reach, " +
        "not who he is.",
    },
    {
      id: "hermes-soul",
      label: "SOUL.md — identity",
      kind: "config",
      description:
        "Optional personality file read on every turn. When present it replaces " +
        "the default identity — this is where 'you are the brain of Fractera, " +
        "you orchestrate development' belongs.",
    },
    skillsGroup("hermes-skills", [
      skill("delegate-task", "delegate-task"),
      skill("record-deployment", "record-deployment"),
      skill("choose-agent", "choose-agent"),
    ]),
    {
      id: "hermes-memory",
      label: "Memory — lightrag-memory",
      kind: "group",
      description:
        "Plugin that prefetches from fractera-rag and ingests each turn. Wired " +
        "in config; depends on the Memory service having a working key.",
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
        "A gateway process that lets you reach the same brain from Telegram on " +
        "your phone. Benefit: you can start, check on, or steer work away from the " +
        "keyboard; the workspace keeps building while you are out.",
    },
  ],
}
