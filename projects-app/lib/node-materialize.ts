import { writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { completeStep } from "@/lib/dev-steps";
import { writeVersionByRef, archiveAndClearTransport, setLifecycleState } from "@/lib/entity-store";
import { compileNode } from "@/lib/node-compile";
import {
  readNodeFiles, functionsAreEmpty, stripDraftFlag, regenerateDiagram, liveSlugsInOrder, patchGraphNode,
  type NodeRow, type ResolvedProject,
} from "@/lib/nodes";

// Materialize a node (extracted from the route in step 250 so the in-product develop agent's tool executor
// and the HTTP route run the SAME code path): compile FIRST (a node that does not bundle is refused with
// the compiler's own error text and nothing is mutated), then strip draft, record a version, flip the index
// row, per-object closure (archive the brief + assert the lifecycle flag), regenerate the diagram. NO
// REBUILD — the executor imports the compiled artifact from disk, so the code is live on return.

export type MaterializeResult =
  | { ok: true; cuid: string; version: number; live: true; compiled: string; completedStep: string | null }
  | { ok: false; error: string };

export async function materializeNode(
  proj: ResolvedProject,
  row: NodeRow,
  summary: string,
  devStepRef?: string | null,
): Promise<MaterializeResult> {
  const nodeDir = join(proj.projectDir, "_nodes", row.slug);
  const files = await readNodeFiles(proj.projectDir, row.slug);
  if (functionsAreEmpty(files.functions)) {
    return { ok: false, error: "cannot materialize: functions.ts is empty — write the node's functions first" };
  }

  const compiled = await compileNode(proj.projectDir, row.slug);
  if (!compiled.ok) {
    return { ok: false, error: `cannot materialize: functions.ts does not compile:\n${compiled.error}` };
  }

  const materializedMeta = stripDraftFlag(files.meta);
  await writeFile(join(nodeDir, "meta.ts"), materializedMeta, "utf8");
  if (files.spec) await rm(join(nodeDir, "spec.md"), { force: true });

  const version = row.latest_version + 1;
  await writeVersionByRef(row.automation, "node", row.cuid, version, {
    metaJson: materializedMeta, functionsSrc: files.functions, instructionSrc: files.instruction,
    specSrc: files.spec, summary,
  }, devStepRef ?? null);

  await patchGraphNode(row.automation, row.cuid, {
    draft: false, status: "materialized", latestVersion: version, activeVersion: version,
  });

  let completed: string | null = null;
  if (devStepRef) completed = await completeStep(Number(devStepRef), summary);

  // PER-OBJECT CLOSURE (step 249): finishing the node IS what clears its brief, and a node really landing
  // is the order-proof evidence the lifecycle flag was always looking for.
  await archiveAndClearTransport(row.automation, "node", row.cuid, devStepRef ?? undefined);
  await setLifecycleState(row.automation, "real-automation");

  await regenerateDiagram(proj.projectDir, await liveSlugsInOrder(row.automation));
  return { ok: true, cuid: row.cuid, version, live: true, compiled: compiled.file, completedStep: completed };
}
