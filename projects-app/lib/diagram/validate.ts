import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

// FROZEN STANDARD (step 223.C.5) — the machine validation of the two critical invariants:
//   1. The diagram is the ONLY source of truth (223.A §6): behaviour lives in diagram nodes, never in a
//      second file (the telegram-notes-style _workflow split is forbidden for new automations).
//   2. Co-location (223.B §5): a node's functions live ONLY in _nodes/<id>/, and every _nodes/<id>/
//      folder must correspond to a node the diagram actually references (no orphan functions).
// This is a filesystem check (no dynamic import of the route-group path). It returns the violations so
// an agent, a UI button, or CI can gate on them.
const ALLOWED_NODE_FILES = new Set(["meta.ts", "functions.ts", "instruction.ts", "index.ts"]);

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
    // Only the allowed node files may live in a node folder.
    try {
      const files = await readdir(join(nodesDir, id));
      for (const f of files) {
        if (!ALLOWED_NODE_FILES.has(f)) {
          violations.push(
            `_nodes/${id}/${f} is not an allowed node file (meta.ts | functions.ts | instruction.ts).`,
          );
        }
      }
    } catch {
      /* unreadable folder — skip */
    }
  }

  return { ok: violations.length === 0, violations };
}
