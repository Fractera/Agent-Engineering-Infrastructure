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
      label: "Steps",
      kind: "group",
      description: "The work journal: what was done and why, step by step.",
      children: [
        {
          id: "doc-old-steps",
          label: "old steps",
          kind: "group",
          description:
            "Snapshots of completed steps (one file each) plus the index map.",
        },
        {
          id: "doc-next-step",
          label: "next step",
          kind: "config",
          description: "The current task — known constraints, subtasks and scope.",
        },
      ],
    },
    {
      id: "doc-patterns",
      label: "Patterns",
      kind: "group",
      description: "Reusable approaches that worked — consult before solving anew.",
    },
    {
      id: "doc-antipatterns",
      label: "Anti-patterns",
      kind: "group",
      description: "Dead-ends that cost time — read to avoid repeating them.",
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
