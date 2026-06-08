import type { ArchNode } from "./types"

// Small builders that keep the architecture catalogue terse and consistent.

export function platform(id: string, label: string, doc: string): ArchNode {
  return {
    id,
    label,
    kind: "platform",
    description:
      `${label}: a subscription AI coding platform driven through the bridge. ` +
      `Its primary instructions live in ${doc}; the rest is its skills and MCP ` +
      "servers. Expand to read, edit or add.",
    children: [
      {
        id: `${id}-doc`,
        label: doc,
        kind: "config",
        description:
          `${doc} — the primary project-context file ${label} reads on every ` +
          "run. Benefit: one place to set how this agent behaves in your repo. " +
          "We will view and edit these here together.",
      },
      skillsGroup(`${id}-skills`, []),
      {
        id: `${id}-mcp`,
        label: "MCP",
        kind: "group",
        addable: true,
        addLabel: "Add MCP",
        description: `MCP servers available to ${label}.`,
        children: [
          {
            id: `${id}-mcp-empty`,
            label: "empty.mcp",
            kind: "mcp",
            description:
              "Placeholder — no MCP server is registered for this agent yet. " +
              "Use + above to add one; its definition will render here.",
          },
        ],
      },
    ],
  }
}

export function skillsGroup(id: string, skills: ArchNode[]): ArchNode {
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

export function skill(id: string, label: string): ArchNode {
  return {
    id,
    label,
    kind: "skill",
    description: `Skill "${label}". The skill text will render here.`,
  }
}

export function mcp(id: string, label: string): ArchNode {
  return { id, label, kind: "mcp", description: `MCP server: ${label}.` }
}
