import type { ArchNode } from "./types"

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
