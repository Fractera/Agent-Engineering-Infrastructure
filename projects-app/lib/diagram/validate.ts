import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

// FROZEN STANDARD (step 223.C.5) — the machine validation of the two critical invariants:
//   1. The diagram is the ONLY source of truth (223.A §6): behaviour lives in diagram nodes, never in a
//      second file (the telegram-notes-style _workflow split is forbidden for new automations).
//   2. Co-location (223.B §5): a node's functions live ONLY in _nodes/<id>/, and every _nodes/<id>/
//      folder must correspond to a node the diagram actually references (no orphan functions).
// This is a filesystem check (no dynamic import of the route-group path). It returns the violations so
// an agent, a UI button, or CI can gate on them.
//
// EVOLUTION (step 224, Builder mode) — a node has a lifecycle. A DRAFT node (meta.ts carries draft:true) is
// a legal not-yet-built stub: it has an EMPTY functions.ts and a spec.md (the owner's free-form brief). A
// MATERIALIZED node (no draft flag) is the opposite: a NON-empty functions.ts and NO spec.md. So spec.md is
// now an allowed node file, and the two states are enforced below. This is the documented softening of
// "the diagram is the single source of truth" — a draft is on the canvas (files) but ignored by execution.
// functions.compiled.mjs joined in step 251: it is the RUNTIME ARTIFACT materialize emits since the light
// loop (step 249) — the executor imports it from disk. Before this line, validate flagged it as a
// violation and an honest agent DELETED it to pass validation, silently unplugging its own live node
// (caught in the step-251 Haiku test).
const ALLOWED_NODE_FILES = new Set(["meta.ts", "functions.ts", "instruction.ts", "spec.md", "index.ts", "functions.compiled.mjs"]);

export type DiagramValidation = { ok: boolean; violations: string[] };

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

export async function validateProjectDiagram(projectDir: string): Promise<DiagramValidation> {
  const violations: string[] = [];

  // The diagram file must exist — it is the single source of truth.
  let diagramText = "";
  try {
    diagramText = await readFile(join(projectDir, "_data", "diagram.ts"), "utf8");
  } catch {
    violations.push("_data/diagram.ts is missing — the diagram is the single source of truth.");
  }

  // Invariant 1: no second file defining behaviour (the forbidden _workflow split).
  if (await exists(join(projectDir, "_workflow"))) {
    violations.push(
      "_workflow/ exists — behaviour must live in the diagram nodes, not a second file (223.A §6).",
    );
  }

  // Invariant 2: co-location. Inspect every _nodes/<id>/ folder.
  const nodesDir = join(projectDir, "_nodes");
  let nodeFolders: string[] = [];
  try {
    const entries = await readdir(nodesDir, { withFileTypes: true });
    nodeFolders = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    // No _nodes folder is fine (e.g. the default 3-node skeleton has inline nodes with no functions).
  }

  for (const id of nodeFolders) {
    // The node folder must be referenced by the diagram — otherwise it is behaviour outside the diagram.
    if (!diagramText.includes(`_nodes/${id}/`)) {
      violations.push(
        `_nodes/${id}/ is not referenced by _data/diagram.ts — a node exists only in the diagram (orphan functions).`,
      );
    }
    const folder = join(nodesDir, id);
    let files: string[] = [];
    try {
      files = await readdir(folder);
    } catch {
      continue; // unreadable folder — skip
    }
    // Only the allowed node files may live in a node folder.
    for (const f of files) {
      if (!ALLOWED_NODE_FILES.has(f)) {
        violations.push(
          `_nodes/${id}/${f} is not an allowed node file (meta.ts | functions.ts | instruction.ts | spec.md).`,
        );
      }
    }
    // Draft vs materialized (step 224). Draft = meta.ts draft:true -> empty functions.ts + a spec.md.
    const metaText = await readFile(join(folder, "meta.ts"), "utf8").catch(() => "");
    const fnText = await readFile(join(folder, "functions.ts"), "utf8").catch(() => "");
    const isDraft = /["']?draft["']?\s*:\s*true/.test(metaText); // tolerate a quoted key ("draft": true)
    const hasSpec = files.includes("spec.md");
    const functionsEmpty = fnText.trim() === "" || /FUNCTIONS[^=]*=\s*\[\s*\]/.test(fnText);
    if (isDraft) {
      if (!functionsEmpty)
        violations.push(`_nodes/${id}/ is a draft (meta draft:true) but functions.ts is not empty — a draft has no functions yet.`);
      if (!hasSpec)
        violations.push(`_nodes/${id}/ is a draft but has no spec.md — a draft needs its free-form spec.`);
    } else {
      if (functionsEmpty)
        violations.push(`_nodes/${id}/ is materialized but functions.ts is empty — a materialized node must have functions (or mark it draft:true).`);
      if (hasSpec)
        violations.push(`_nodes/${id}/ is materialized but still keeps spec.md — spec.md belongs only to a draft.`);
    }
  }

  return { ok: violations.length === 0, violations };
}

// GLOBAL EDGES (step 225) — the same co-location contract, one level up. An edge lives in its OWN folder
// projects/_edges/<cuid>/ and belongs to no project. A DRAFT edge legally has an empty functions.ts + a
// spec.md; a MATERIALIZED one must have non-empty functions and no spec.md. An edge folder with no row in
// the index is an ORPHAN (its projects were deleted, or someone hand-created it) — a violation, because the
// canvas is the single source of truth for the global graph, exactly as the diagram is for an automation.
const ALLOWED_EDGE_FILES = new Set(["meta.ts", "functions.ts", "spec.md", "index.ts"]);

export async function validateEdges(
  edgesDir: string,
  liveEdgeCuids: string[],
): Promise<DiagramValidation> {
  const violations: string[] = [];
  let folders: string[] = [];
  try {
    folders = (await readdir(edgesDir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return { ok: true, violations }; // no edges yet — fine
  }
  const live = new Set(liveEdgeCuids);

  for (const cuid of folders) {
    if (!live.has(cuid)) {
      violations.push(`_edges/${cuid}/ is not in the global canvas index — an orphan link (its projects may have been deleted).`);
    }
    const dir = join(edgesDir, cuid);
    let files: string[] = [];
    try { files = await readdir(dir); } catch { continue; }
    for (const f of files) {
      if (!ALLOWED_EDGE_FILES.has(f)) {
        violations.push(`_edges/${cuid}/${f} is not an allowed edge file (meta.ts | functions.ts | spec.md).`);
      }
    }
    const fnText = await readFile(join(dir, "functions.ts"), "utf8").catch(() => "");
    const empty = fnText.trim() === "" || /FUNCTIONS[^=]*=\s*\[\s*\]/.test(fnText);
    const hasSpec = files.includes("spec.md");
    if (empty && !hasSpec) {
      violations.push(`_edges/${cuid}/ has no functions and no spec.md — a draft edge needs its brief.`);
    }
    if (!empty && hasSpec) {
      violations.push(`_edges/${cuid}/ is materialized but still keeps spec.md — spec.md belongs only to a draft.`);
    }
  }
  return { ok: violations.length === 0, violations };
}
