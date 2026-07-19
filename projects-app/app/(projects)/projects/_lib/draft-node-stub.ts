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
  /** Estimated process time in ms (step 230, the Processes timeline). Absent → the default estimate. */
  estDurationMs?: number;
  /** v16 routes (254.9) carry their OWN _types/node-contract — the stub must import THAT, or the
      check:route gate flags every newborn draft (caught live on automation-48qwh, 263.1). The caller
      checks the route's _types/node-contract.ts on disk; pre-v16 routes keep the _shared relic. */
  hasOwnTypes?: boolean;
};

/** The three files of a fresh draft node folder: meta.ts (draft:true), empty functions.ts, spec.md. */
export function draftNodeStubFiles(input: DraftNodeInput): Record<string, string> {
  const name = JSON.stringify(input.name);
  const cuid = JSON.stringify(input.cuid);
  const id = JSON.stringify(input.slug);
  const est = typeof input.estDurationMs === "number" && input.estDurationMs > 0 ? input.estDurationMs : 60000;
  const contract = input.hasOwnTypes ? "../../_types/node-contract" : "../../../../_shared/node-contract";
  return {
    "meta.ts": `import type { NodeMeta } from "${contract}";

// Draft node (step 224) — not yet built. Empty functions + a spec.md brief; a red frame on the canvas;
// ignored by execution until the coder materializes it. The cuid is the stable identity the DB canvas
// index + the per-node version history join on. estDurationMs (step 230) is the estimated process time.
export const META: NodeMeta = {
  id: ${id},
  cuid: ${cuid},
  name: ${name},
  description: "",
  in: {},
  out: {},
  run: "sequential",
  draft: true,
  estDurationMs: ${est},
};
`,
    "functions.ts": `import type { NodeFunction } from "${contract}";

// Draft — no functions yet. The coder materializes these from spec.md (step 224).
export const FUNCTIONS: NodeFunction[] = [];
`,
    "spec.md": `${input.spec.trim()}\n`,
  };
}
