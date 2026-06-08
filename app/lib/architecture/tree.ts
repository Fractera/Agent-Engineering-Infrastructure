import type { ArchNode } from "./types"

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
        platform("claude", "Claude Code", "orange"),
        platform("codex", "Codex", "green"),
        platform("gemini", "Gemini CLI", "blue"),
        platform("qwen", "Qwen Code", "violet"),
        platform("kimi", "Kimi Code", "cyan"),
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
    {
      id: "hermes",
      label: "fractera-hermes — Brain (Hermes)",
      kind: "service",
      port: ":9119",
      description:
        "The orchestration agent. It coordinates multi-step work across the five " +
        "platforms, reads its memory and its identity at every wake-up, and can " +
        "be reached from Telegram via the gateway process.",
      children: [
        {
          id: "hermes-config",
          label: "config.yaml — wiring",
          kind: "config",
          description:
            "Says what Hermes can reach: model/provider, memory provider, " +
            "plugins, and the five platform MCP servers. Wiring, not rules — it " +
            "lists where he can reach, not who he is.",
        },
        {
          id: "hermes-soul",
          label: "SOUL.md — identity",
          kind: "config",
          description:
            "Optional personality file read on every turn. When present it " +
            "replaces the default identity — this is where 'you are the brain of " +
            "Fractera, you orchestrate development' belongs.",
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
            "Plugin that prefetches from fractera-rag and ingests each turn. " +
            "Wired in config; depends on the Memory service having a working key.",
        },
        {
          id: "hermes-mcp",
          label: "MCP servers — 5 bridges",
          kind: "group",
          description:
            "The five platform bridges exposed to Hermes as callable tools " +
            "(ports 3210–3214). These show up at start-up, which is why Hermes " +
            "sees his tools but not always his memory or role.",
          children: [
            mcp("mcp-claude", "claude-bridge :3210"),
            mcp("mcp-codex", "codex-bridge :3211"),
            mcp("mcp-gemini", "gemini-bridge :3212"),
            mcp("mcp-qwen", "qwen-bridge :3213"),
            mcp("mcp-kimi", "kimi-bridge :3214"),
          ],
        },
        {
          id: "hermes-webui",
          label: "Chat Web UI — fractera-hermes-webui",
          kind: "service",
          port: ":9120",
          description:
            "The chat window inside your workspace where you talk to Hermes in " +
            "plain language. Benefit: you brief the brain like a teammate and it " +
            "drives the five coding platforms for you — no commands to memorise.",
        },
        {
          id: "hermes-telegram",
          label: "Telegram — fractera-hermes-gateway",
          kind: "service",
          description:
            "A gateway process that lets you reach the same brain from Telegram " +
            "on your phone. Benefit: you can start, check on, or steer work away " +
            "from the keyboard; the workspace keeps building while you are out.",
        },
      ],
    },
  ],
}

// ── small builders to keep the catalogue terse and consistent ──

function platform(id: string, label: string, _color: string): ArchNode {
  return {
    id,
    label,
    kind: "platform",
    description:
      `${label}: a subscription AI coding platform driven through the bridge. ` +
      "Its instructions are its skills and its MCP servers. Expand to inspect " +
      "or add a skill.",
    children: [
      skillsGroup(`${id}-skills`, []),
      {
        id: `${id}-mcp`,
        label: "MCP",
        kind: "group",
        description: `MCP servers available to ${label}.`,
      },
    ],
  }
}

function skillsGroup(id: string, skills: ArchNode[]): ArchNode {
  return {
    id,
    label: "Skills",
    kind: "group",
    addable: true,
    addLabel: "Add skill",
    description:
      "The skills this agent loads. Use the + below to add one (the add-skill " +
      "mechanism is wired up in a later step).",
    children: skills,
  }
}

function skill(id: string, label: string): ArchNode {
  return {
    id,
    label,
    kind: "skill",
    description: `Skill "${label}". The skill text will render here.`,
  }
}

function mcp(id: string, label: string): ArchNode {
  return { id, label, kind: "mcp", description: `MCP server: ${label}.` }
}
