import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

// DEVELOPMENT STEPS (step 224 L6) — the handoff to the coding agent. We do NOT invent a mechanism: the
// product already has ONE — the file-based materialize-first queue DEVELOPMENT-STEPS/NEW-STEPS/ ->
// COMPLETED-STEPS/, where each step is NN-slug.md ending in the machine block <!-- fractera:step {...} -->,
// read by the Admin service page :3002/service/development-steps. "Start development" MATERIALIZES a step
// file into that queue; the owner copies the message into a coder chat (Codex / Claude Code), the agent
// executes the step, writes the node's real functions and calls materialize — and the node gains a version.
//
// The spec text is a DETERMINISTIC template (owner's choice: no model call, no API key needed).

const STEPS_DIR = () => join(process.cwd(), "DEVELOPMENT-STEPS");

/** Next free step number across NEW-STEPS + COMPLETED-STEPS (the queue's own numbering, product-side). */
export async function nextStepNumber(): Promise<number> {
  let max = 0;
  for (const dir of ["NEW-STEPS", "COMPLETED-STEPS"]) {
    const files = await readdir(join(STEPS_DIR(), dir)).catch(() => [] as string[]);
    for (const f of files) {
      const n = Number((f.match(/^(\d+)-/) ?? [])[1]);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return max + 1;
}

export type NodeStepInput = {
  number: number;
  automation: string;      // "category/slug"
  nodeCuid: string;
  nodeSlug: string;
  nodeName: string;
  spec: string;            // the owner's free-form brief (a draft) or the new instruction (an optimization)
  optimization: boolean;   // false = build a draft node; true = re-build a live node from a changed instruction
  targetVersion: number;   // the version the coder will produce (latest + 1)
};

/** The copy-paste message the owner hands to the coding agent (also the body of the step file). */
export function buildNodeStepMessage(i: NodeStepInput): string {
  const kind = i.optimization ? "OPTIMIZE an existing node" : "BUILD a draft node";
  return `Execute development step #${i.number} in the Fractera projects app.

TASK: ${kind} of the automation "${i.automation}".

NODE
- name: ${i.nodeName}
- folder: app/(projects)/projects/${i.automation}/_nodes/${i.nodeSlug}/
- cuid (stable identity — never change it): ${i.nodeCuid}
- target version: v${i.targetVersion}

WHAT THE OWNER WANTS (verbatim):
${i.spec.trim() || "(no brief given)"}

WHAT TO DO
1. Read app/(projects)/README.md — "The diagram standard" and "The node -> functions contract".
2. Write the node's REAL functions in _nodes/${i.nodeSlug}/functions.ts as a typed NodeFunction[]:
   deterministic application code, each function with typed paramsIn and a typed return. AI is allowed ONLY
   as an explicit external tool-call step (NodeFunction.externalAi with the FULL system instruction).
3. Write/refresh _nodes/${i.nodeSlug}/instruction.ts (export const INSTRUCTION = ...) — the system
   instruction that produced these functions.
4. Keep CO-LOCATION: everything for this node lives ONLY in its own folder. Never create a second file of
   behaviour (no _workflow/), never touch another node's folder. The diagram is the single source of truth.
5. MANDATORY closing call — this is what materializes the node, drops its draft flag and records the version:
   curl -X POST http://localhost:3003/api/projects/nodes/${i.nodeCuid}/materialize \\
        -H "Content-Type: application/json" \\
        -d '{"summary":"<what you built>","devStepRef":"${i.number}"}'
6. Verify: GET http://localhost:3003/api/projects/validate?automation=${i.automation} returns ok:true.

DONE = functions.ts is non-empty, materialize returned version ${i.targetVersion}, the validator is clean.`;
}

/** Materialize the step file into DEVELOPMENT-STEPS/NEW-STEPS/ (the existing product queue). */
export async function materializeNodeStep(i: NodeStepInput): Promise<{ file: string; message: string }> {
  const message = buildNodeStepMessage(i);
  const slug = `${i.optimization ? "optimize" : "build"}-node-${i.nodeSlug}`;
  const name = `${i.optimization ? "Optimize" : "Build"} node "${i.nodeName}" of ${i.automation}`;
  const block = JSON.stringify({
    number: i.number,
    name,
    importance: "mandatory",
    status: "new",
    completedAt: null,
    description: `${i.optimization ? "Rebuild" : "Build"} the node ${i.nodeSlug} (cuid ${i.nodeCuid}) of the automation ${i.automation} to version ${i.targetVersion}, from the owner's brief. Write the typed functions + the instruction co-located in _nodes/${i.nodeSlug}/, then call the materialize endpoint.`,
    tasks: [
      { id: `${i.nodeCuid}-fn`, body: `Write the typed functions in _nodes/${i.nodeSlug}/functions.ts` },
      { id: `${i.nodeCuid}-instr`, body: `Write the system instruction in _nodes/${i.nodeSlug}/instruction.ts` },
      { id: `${i.nodeCuid}-mat`, body: `POST /api/projects/nodes/${i.nodeCuid}/materialize to record version ${i.targetVersion}` },
    ],
  });
  const body = `# ${String(i.number).padStart(2, "0")} — ${name}\n\n> Development step · importance: mandatory · generated by the Builder (step 224)\n\n## The brief (from the owner, in the Builder panel)\n\n${i.spec.trim() || "(no brief given)"}\n\n## The message handed to the coding agent\n\n\`\`\`\n${message}\n\`\`\`\n\n<!-- fractera:step\n${block}\n-->\n`;

  const dir = join(STEPS_DIR(), "NEW-STEPS");
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${String(i.number).padStart(2, "0")}-${slug}.md`);
  await writeFile(file, body, "utf8");
  return { file, message };
}

// ─── L7: the QUEUE an agent drains (full-auto) ───────────────────────────────────────────────────────
// The manual flow and the automatic flow are the SAME endpoints — in manual mode the owner carries the
// message to a coder chat; in full-auto the coding agent reads the pending queue itself, builds the node,
// and calls materialize. No second mechanism: this is a thin read/close layer over the step files.

export type PendingStep = {
  number: number;
  name: string;
  file: string;
  automation: string;
  nodeCuid: string;
  nodeSlug: string;
  /** The full copy-paste brief (the fenced block of the step file) — what the agent must execute. */
  message: string;
};

function parseStepFile(body: string, file: string, number: number): PendingStep | null {
  const block = body.match(/<!--\s*fractera:step\s*([\s\S]*?)-->/);
  if (!block) return null;
  let meta: { name?: string } = {};
  try { meta = JSON.parse(block[1].trim()) as { name?: string }; } catch { /* keep going */ }
  const message = (body.match(/```\n([\s\S]*?)```/) ?? [])[1]?.trim() ?? "";
  const automation = (message.match(/automation "([^"]+)"/) ?? [])[1] ?? "";
  const nodeCuid = (message.match(/cuid[^:]*:\s*([a-z0-9]+)/i) ?? [])[1] ?? "";
  const nodeSlug = (message.match(/_nodes\/([a-z0-9-]+)\//) ?? [])[1] ?? "";
  return { number, name: meta.name ?? "", file, automation, nodeCuid, nodeSlug, message };
}

/** Every step still waiting in NEW-STEPS/, oldest first — the agent's work queue. */
export async function pendingSteps(): Promise<PendingStep[]> {
  const dir = join(STEPS_DIR(), "NEW-STEPS");
  const files = (await readdir(dir).catch(() => [] as string[])).filter((f) => f.endsWith(".md")).sort();
  const out: PendingStep[] = [];
  for (const f of files) {
    const number = Number((f.match(/^(\d+)-/) ?? [])[1]);
    if (!Number.isFinite(number)) continue;
    const body = await readFile(join(dir, f), "utf8").catch(() => "");
    const parsed = parseStepFile(body, f, number);
    if (parsed) out.push(parsed);
  }
  return out;
}

/** Close a step: move NEW-STEPS/NN-*.md to COMPLETED-STEPS/ with status=completed + completedAt. Called by
 *  materialize when the coder passes devStepRef — this is what keeps the queue honest (a built node's step
 *  never stays pending). Idempotent: a missing file is not an error. */
export async function completeStep(number: number, report?: string): Promise<string | null> {
  const newDir = join(STEPS_DIR(), "NEW-STEPS");
  const doneDir = join(STEPS_DIR(), "COMPLETED-STEPS");
  const files = (await readdir(newDir).catch(() => [] as string[]))
    .filter((f) => f.endsWith(".md") && Number((f.match(/^(\d+)-/) ?? [])[1]) === number);
  if (!files.length) return null;
  const name = files[0];
  const src = join(newDir, name);
  let body = await readFile(src, "utf8").catch(() => "");
  const completedAt = new Date().toISOString();
  body = body.replace(/"status"\s*:\s*"new"/, '"status":"completed"').replace(/"completedAt"\s*:\s*null/, `"completedAt":"${completedAt}"`);
  if (report) body += `\n## Report\n\n${report.trim()}\n`;
  await mkdir(doneDir, { recursive: true });
  const dest = join(doneDir, name);
  await writeFile(dest, body, "utf8");
  await rm(src, { force: true });
  return dest;
}
