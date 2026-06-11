import type { ArchNode } from "./types"
import { AGENTS } from "@/lib/ai-draft/agents"

// The Documentation corpus — the shared knowledge every agent references and the
// material that feeds Company Brain (Memory / LightRAG). Kept in its own module
// so the main tree stays small. One place to read, edit and register the
// project's living memory.

export const DOCS_NODE: ArchNode = {
  id: "docs",
  label: "Documentation — Company Brain corpus",
  kind: "group",
  description:
    "The shared knowledge every agent references. Ingest these into Company " +
    "Brain (Memory / LightRAG) and any agent can recall them semantically. One " +
    "place to read, edit and register the project's living memory.",
  children: [
    {
      id: "doc-glossary",
      label: "GLOSSARY.md",
      kind: "config",
      href: "/glossary",
      description:
        "Project terms — approved abbreviations / preferred phrasings so every agent " +
        "reads them the same way (e.g. aws -> ai-workspace). A real file at the project " +
        "root, edited via the /glossary page; agents read it directly as context.",
    },
    {
      id: "doc-steps",
      label: "DEVELOPMENT-STEPS",
      kind: "group",
      href: "/development-steps",
      description:
        "The work log — every step of how the app is built, kept as real markdown " +
        "files an agent reads and writes. Edited via the /development-steps page; " +
        "files live in DEVELOPMENT-STEPS/ at the project root.",
      children: [
        {
          id: "doc-new-steps",
          label: "NEW-STEPS",
          kind: "group",
          description:
            "Open steps — one file per active task (number, name, importance, " +
            "description, to-do). Shown under New steps; editable.",
        },
        {
          id: "doc-completed-steps",
          label: "COMPLETED-STEPS",
          kind: "group",
          description:
            "Finished steps — moved here with a completion date. Read-only history " +
            "shown under Completed steps.",
        },
      ],
    },
    {
      id: "doc-patterns",
      label: "PATTERNS",
      kind: "group",
      href: "/patterns",
      description:
        "The reuse library — reusable code patterns and deployment anti-patterns, kept " +
        "as real markdown files an agent reads and writes. Edited via the /patterns page; " +
        "files live in PATTERNS/ at the project root.",
      children: [
        {
          id: "doc-patterns-patterns",
          label: "PATTERNS",
          kind: "group",
          description:
            "Reusable code patterns in a one-level tree by category (UI Elements, " +
            "Sections, Brandbook). Reuse or extend one before re-deriving it.",
        },
        {
          id: "doc-patterns-anti",
          label: "ANTI-PATTERNS",
          kind: "group",
          description:
            "Deployment pitfalls — a flat list an agent reads before every deploy " +
            "to avoid repeating them.",
        },
      ],
    },
    {
      id: "doc-ai-draft",
      label: "AI-DRAFT-SETTINGS",
      kind: "group",
      href: "/ai-draft-settings",
      description:
        "The draft layer — free-form wishes for the six agents' real instruction / skill / " +
        "MCP files, kept as real markdown an agent reads and applies later. The originals are " +
        "never edited here; this is a mirror. Edited via the /ai-draft-settings page; files live " +
        "in AI-DRAFT-SETTINGS/ at the project root — one folder per agent, each with its " +
        "instruction doc(s) + SKILLS/ + MCP/.",
      // Real on-disk structure, derived from the same agent registry the page uses
      // (lib/ai-draft/agents.ts) so this stays truthful: six agent folders, each
      // holding its instruction draft(s) + SKILLS/ + MCP/.
      children: AGENTS.map((a): ArchNode => ({
        id: `doc-ai-draft-${a.id}`,
        label: a.folder,
        kind: "group",
        description:
          `${a.label}: its draft folder — ${a.docs.map(d => d.name).join(" + ")} (instruction) ` +
          "plus SKILLS/ and MCP/. Wishes that supplement or replace its real files.",
        children: [
          {
            id: `doc-ai-draft-${a.id}-doc`,
            label: a.docs.map(d => d.name).join(" · "),
            kind: "config",
            description:
              `Instruction draft${a.docs.length > 1 ? "s" : ""} for ${a.label}. Supplement or ` +
              "replace the real document; an agent applies the wishes later.",
          },
          {
            id: `doc-ai-draft-${a.id}-skills`,
            label: "SKILLS",
            kind: "group",
            description:
              "Draft skills. The agent's real skills show as read-only reference; a draft is laid " +
              "over one (supplement / replace) or added as a new requested skill (amber + req).",
          },
          {
            id: `doc-ai-draft-${a.id}-mcp`,
            label: "MCP",
            kind: "group",
            description:
              "Draft MCP connectors. The agent's real bridges show as read-only reference; a draft " +
              "supplements / replaces one or requests a new connector.",
          },
        ],
      })),
    },
    {
      id: "doc-about",
      label: "About Fractera",
      kind: "config",
      description:
        "One voluminous document describing absolutely everything about the " +
        "project — written to be ingested whole into the vector store as the " +
        "canonical ground truth for every agent.",
    },
    {
      id: "doc-external",
      label: "Documents",
      kind: "group",
      addable: true,
      addLabel: "Add document",
      description:
        "External documentation to ingest into the vector store — e.g. a " +
        "platform's full docs (Codex, Gemini) so agents can answer from them.",
    },
  ],
}
