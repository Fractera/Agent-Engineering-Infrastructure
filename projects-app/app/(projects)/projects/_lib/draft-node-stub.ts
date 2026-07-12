// FROZEN STANDARD (step 224, Builder mode) — the DRAFT NODE stub. When the owner pulls a new node onto the
// canvas in Builder, it is born a DRAFT: a co-located _nodes/<slug>/ folder with meta.ts (draft:true), an
// EMPTY functions.ts and a spec.md (the owner's free-form brief). It renders with a red frame and is ignored
// by execution (a project with any draft auto-stops -> status In development). The coder later materializes
// it (writes the real functions, drops the draft flag) and it gains version 1. This helper returns the file
// bodies keyed by their path inside the node folder; the create-node route (step 224 L3) writes them.
// Keys are written UNQUOTED (a hand-formatted literal, like every other meta.ts) so the draft flag reads
// cleanly and the validator's draft check is unambiguous.

export type DraftNodeInput = {
  cuid: string;
  /** Kebab-case folder name (the human-readable _nodes/<slug>/). */
  slug: string;
  name: string;
  /** The owner's free-form brief, from which the coder materializes the real functions. */
  spec: string;
};

/** The three files of a fresh draft node folder: meta.ts (draft:true), empty functions.ts, spec.md. */
export function draftNodeStubFiles(input: DraftNodeInput): Record<string, string> {
  const name = JSON.stringify(input.name);
  const cuid = JSON.stringify(input.cuid);
  const id = JSON.stringify(input.slug);
  return {
    "meta.ts": `import type { NodeMeta } from "../../../../_shared/node-contract";

// Draft node (step 224) — not yet built. Empty functions + a spec.md brief; a red frame on the canvas;
// ignored by execution until the coder materializes it. The cuid is the stable identity the DB canvas
// index + the per-node version history join on.
export const META: NodeMeta = {
  id: ${id},
  cuid: ${cuid},
  name: ${name},
  description: "",
  in: {},
  out: {},
  run: "sequential",
  draft: true,
};
`,
    "functions.ts": `import type { NodeFunction } from "../../../../_shared/node-contract";

// Draft — no functions yet. The coder materializes these from spec.md (step 224).
export const FUNCTIONS: NodeFunction[] = [];
`,
    "spec.md": `${input.spec.trim()}\n`,
  };
}
