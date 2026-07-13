import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";

// DEVELOPMENT STEPS (step 224 L6) — the handoff to the coding agent. We do NOT invent a mechanism: the
// product already has ONE — the file-based materialize-first queue DEVELOPMENT-STEPS/NEW-STEPS/ ->
// COMPLETED-STEPS/, where each step is NN-slug.md ending in the machine block <!-- fractera:step {...} -->,
// read by the Admin service page :3002/service/development-steps. "Start development" MATERIALIZES a step
// file into that queue; the owner copies the message into a coder chat (Codex / Claude Code), the agent
// executes the step, writes the node's real functions and calls materialize — and the node gains a version.
//
// The spec text is a DETERMINISTIC template (owner's choice: no model call, no API key needed).

// THE AUTHORITATIVE QUEUE LOCATION (step 233 fix). The single Development Steps entity is read by Admin
// :3002 via slotRoot() = the SLOT app root (/opt/fractera/app). projects-app must write THERE, not into its
// own cwd — otherwise the steps land in /opt/fractera/projects-app/DEVELOPMENT-STEPS, a silo the Admin page
// never reads, so a "run step #NN" the owner is told does not resolve. We mirror bridges/lib/slot-root.ts:
// SLOT_DIR env override, else the sibling slot two dirs up (projects-app cwd → ../app).
function slotRoot(): string {
  const override = process.env.SLOT_DIR?.trim();
  if (override) return resolve(override);
  return resolve(process.cwd(), "../app");
}
const STEPS_DIR = () => join(slotRoot(), "DEVELOPMENT-STEPS");

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

// ─── "START DEVELOPMENT": Quiz + nodes → ONE step, sub-steps = nodes (step 233) ───────────────────────
// The owner's top-level handoff. The whole design so far (the use cases, the automation's instruction, and
// every draft node's spec = the Quiz result) becomes ONE Development Step whose SUB-STEPS (tasks[]) are the
// nodes going into work. The brief opens with a MANDATORY ordered read: first the single authoritative doc
// AUTOMATION-PROJECTS.md (how automations are built — a stub for now, authored in later steps), then the
// Quiz result below, then the nodes below. Assembled DETERMINISTICALLY (no model call). The owner never
// sees this text — only "run step #NN".

// The single authoritative doc every automation handoff must be read against (step 233). It lives at the
// product/agent root and is registered in every agent's root instructions; here we only REFERENCE it.
const AUTOMATION_DOC = "AUTOMATION-PROJECTS.md";

export type AutomationStepInput = {
  number: number;
  automation: string;                                   // "category/slug"
  instruction: string;                                  // _data/instruction.md (the owner's top-level ask)
  useCases: { title: string; summary: string; status: string }[];
  nodes: { cuid: string; slug: string; name: string; spec: string }[];  // the draft nodes = sub-steps
};

export function buildAutomationStepMessage(i: AutomationStepInput): string {
  const cases = i.useCases.length
    ? i.useCases.map((c, k) => `${String(k + 1).padStart(2, "0")}. ${c.title} [${c.status}]\n    ${c.summary || "(no description)"}`).join("\n")
    : "(no use cases)";
  const nodes = i.nodes.length
    ? i.nodes.map((n, k) => `### ${k + 1}. ${n.name}\n- folder: app/(projects)/projects/${i.automation}/_nodes/${n.slug}/\n- cuid (stable identity — never change it): ${n.cuid}\n\n${n.spec.trim() || "(no spec yet)"}`).join("\n\n")
    : "(no nodes)";
  return `Execute development step #${i.number} in the Fractera projects app.

TASK: develop the automation "${i.automation}" — build the ${i.nodes.length} node(s) below.

## READ FIRST (mandatory — in this order, BEFORE writing any code)
1. Read ${AUTOMATION_DOC} at the project root — the single authoritative document on how automations
   (a.k.a. projects / projects-automation) are created, work and are improved. You cannot build correctly
   without it.
2. Study the Quiz result of THIS automation — the instruction and use cases below.
3. Study the existing nodes below (their specs are what the Quiz designed).
The diagram is the SINGLE source of truth; keep every node's work co-located in its own _nodes/<slug>/ folder.

## THIS AUTOMATION
Owner instruction:
${i.instruction.trim() || "(not stated)"}

Use cases:
${cases}

## NODES TO BUILD (one sub-step each)
${nodes}

DONE = every node's functions.ts is real and typed, each node materialized (POST
/api/projects/nodes/<cuid>/materialize with devStepRef "${i.number}"), the validator is clean.`;
}

/** Materialize the ONE bundled "start development" step (step 233). Deterministic; tasks[] = nodes. */
export async function materializeAutomationStep(i: AutomationStepInput): Promise<{ file: string; message: string; name: string }> {
  const message = buildAutomationStepMessage(i);
  const name = `Develop ${i.automation} — ${i.nodes.length} node${i.nodes.length === 1 ? "" : "s"}`;
  const slug = `develop-${i.automation.replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "")}`;
  const block = JSON.stringify({
    number: i.number,
    name,
    importance: "mandatory",
    status: "new",
    completedAt: null,
    description: `Develop the automation ${i.automation}: build its ${i.nodes.length} node(s) from the Quiz result + use cases. READ ${AUTOMATION_DOC} FIRST, then the Quiz result, then the nodes. The diagram is the source of truth.`,
    tasks: i.nodes.map((n) => ({ id: n.cuid, body: `Build node "${n.name}" (_nodes/${n.slug}/)` })),
  });
  const body = `# ${String(i.number).padStart(2, "0")} — ${name}\n\n> Development step · importance: mandatory · generated by "Start development" (step 233)\n\n## The brief handed to the coding agent\n\n\`\`\`\n${message}\n\`\`\`\n\n<!-- fractera:step\n${block}\n-->\n`;

  const dir = join(STEPS_DIR(), "NEW-STEPS");
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${String(i.number).padStart(2, "0")}-${slug}.md`);
  await writeFile(file, body, "utf8");
  return { file, message, name };
}

// ─── EDGES (step 225): a link between two automations is built by the same pipeline as a node ─────────

export type EdgeStepInput = {
  number: number;
  edgeCuid: string;
  name: string;
  from: string;            // "category/slug"
  to: string;
  fromNode?: string | null; // the source node's cuid (any node — not only a leaf)
  toNode?: string | null;
  spec: string;
  targetVersion: number;
};

export function buildEdgeStepMessage(i: EdgeStepInput): string {
  return `Execute development step #${i.number} in the Fractera projects app.

TASK: BUILD A LINK (a global edge) between two automations.

LINK
- name: ${i.name}
- folder: app/(projects)/projects/_edges/${i.edgeCuid}/     (the link belongs to NO project — it is BETWEEN them)
- cuid (stable identity — never change it): ${i.edgeCuid}
- source: ${i.from}${i.fromNode ? ` (node cuid ${i.fromNode})` : ""}
- target: ${i.to}${i.toNode ? ` (node cuid ${i.toNode})` : ""}
- target version: v${i.targetVersion}

WHAT THE OWNER WANTS (verbatim):
${i.spec.trim() || "(no brief given)"}

WHAT TO DO
1. Read app/(projects)/README.md — the node/functions contract applies to a link too.
2. Write the integration in _edges/${i.edgeCuid}/functions.ts as a typed NodeFunction[]: deterministic code
   that takes the SOURCE node's output and feeds the TARGET node's input, honouring the conditions above.
   AI is allowed ONLY as an explicit external tool-call step.
3. Keep CO-LOCATION: everything for this link lives ONLY in its own _edges/<cuid>/ folder. Never edit a
   project's nodes to carry the link — that is what the link is for.
4. MANDATORY closing call — it materializes the link, drops its draft flag and records the version:
   curl -X POST http://localhost:3003/api/projects/edges/${i.edgeCuid}/materialize \\
        -H "Content-Type: application/json" \\
        -d '{"summary":"<what you built>","devStepRef":"${i.number}"}'
5. Verify: GET http://localhost:3003/api/projects/edges/validate returns ok:true.

DONE = functions.ts is non-empty, materialize returned version ${i.targetVersion}, the validator is clean.`;
}

export async function materializeEdgeStep(i: EdgeStepInput): Promise<{ file: string; message: string }> {
  const message = buildEdgeStepMessage(i);
  const name = `Build link "${i.name}" (${i.from} to ${i.to})`;
  const block = JSON.stringify({
    number: i.number,
    name,
    importance: "mandatory",
    status: "new",
    completedAt: null,
    description: `Build the global link ${i.edgeCuid} between ${i.from} and ${i.to} to version ${i.targetVersion}, from the owner's brief. The integration code lives ONLY in _edges/${i.edgeCuid}/; call the materialize endpoint to close the step.`,
    tasks: [
      { id: `${i.edgeCuid}-fn`, body: `Write the integration in _edges/${i.edgeCuid}/functions.ts` },
      { id: `${i.edgeCuid}-mat`, body: `POST /api/projects/edges/${i.edgeCuid}/materialize to record version ${i.targetVersion}` },
    ],
  });
  const body = `# ${String(i.number).padStart(2, "0")} — ${name}\n\n> Development step · importance: mandatory · generated by the Global canvas (step 225)\n\n## The brief (from the owner, in the link panel)\n\n${i.spec.trim() || "(no brief given)"}\n\n## The message handed to the coding agent\n\n\`\`\`\n${message}\n\`\`\`\n\n<!-- fractera:step\n${block}\n-->\n`;

  const dir = join(STEPS_DIR(), "NEW-STEPS");
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${String(i.number).padStart(2, "0")}-build-link-${i.edgeCuid.slice(0, 8)}.md`);
  await writeFile(file, body, "utf8");
  return { file, message };
}

// ─── USER CASES (step 231): a CHANGED scenario is built by the same pipeline as a node ───────────────
// A use case is what the automation must DO, in the owner's words. When he edits one (or adds one) after the
// automation already exists, the code must follow — so the change leaves the Quiz as ONE development step in
// the same queue. Unlike a node step, it does not name the files to write: which nodes must change is what
// the coding agent works out from the diagram (the single source of truth) and the case.

export type UseCaseStepInput = {
  number: number;
  automation: string;        // "category/slug"
  caseCuid: string;
  caseNumber: number;        // the case's number on the page (01, 02, …)
  title: string;
  summary: string;
  previous?: string;         // the case as it read BEFORE the edit ("" for a brand-new case)
  nodes: { slug: string; name: string; draft: boolean }[];
};

export function buildUseCaseStepMessage(i: UseCaseStepInput): string {
  const list = i.nodes.length
    ? i.nodes.map((n, k) => `  ${k + 1}. ${n.name} (_nodes/${n.slug}/)${n.draft ? " — still a draft" : ""}`).join("\n")
    : "  (the automation has no nodes yet — design them from this case)";
  return `Execute development step #${i.number} in the Fractera projects app.

TASK: bring the automation "${i.automation}" in line with a CHANGED user case.

USER CASE ${String(i.caseNumber).padStart(2, "0")} (cuid ${i.caseCuid}) — as the owner states it NOW:
${i.title}
${i.summary.trim() || "(no description)"}
${i.previous?.trim() ? `\nHOW IT READ BEFORE:\n${i.previous.trim()}\n` : ""}
THE AUTOMATION'S CURRENT NODES:
${list}

WHAT TO DO
1. Read app/(projects)/README.md — "User cases", "The diagram standard" and "The node -> functions contract".
2. Work out WHICH nodes this case touches. The diagram is the source of truth: change existing nodes, or add
   a node through the Builder API — never write behaviour outside a node's own folder.
3. Implement the case. Keep every other case working: they are all listed in _data/use-cases.ts.
4. Close each node you rebuild with its materialize call (POST /api/projects/nodes/<cuid>/materialize with
   devStepRef "${i.number}"), so the version history records this step.
5. Verify: GET http://localhost:3003/api/projects/validate?automation=${i.automation} returns ok:true.

DONE = the case is implemented by real node functions, the validator is clean, and no other case regressed.`;
}

export async function materializeUseCaseStep(i: UseCaseStepInput): Promise<{ file: string; message: string }> {
  const message = buildUseCaseStepMessage(i);
  const name = `User case ${String(i.caseNumber).padStart(2, "0")} of ${i.automation}: ${i.title}`;
  const block = JSON.stringify({
    number: i.number,
    name,
    importance: "mandatory",
    status: "new",
    completedAt: null,
    description: `Bring the automation ${i.automation} in line with user case ${i.caseCuid} ("${i.title}"). Work out which nodes it touches from the diagram, implement it there, and materialize every node you rebuild.`,
    tasks: [
      { id: `${i.caseCuid}-map`, body: "Work out which nodes this user case touches (the diagram is the truth)" },
      { id: `${i.caseCuid}-impl`, body: "Implement the case in those nodes' functions.ts (co-location)" },
      { id: `${i.caseCuid}-mat`, body: "Materialize every rebuilt node, then run the validator" },
    ],
  });
  const body = `# ${String(i.number).padStart(2, "0")} — ${name}\n\n> Development step · importance: mandatory · generated from a user case (step 231)\n\n## The case (the owner's words)\n\n${i.summary.trim() || "(no description)"}\n\n## The message handed to the coding agent\n\n\`\`\`\n${message}\n\`\`\`\n\n<!-- fractera:step\n${block}\n-->\n`;

  const dir = join(STEPS_DIR(), "NEW-STEPS");
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${String(i.number).padStart(2, "0")}-use-case-${i.caseCuid.slice(0, 8)}.md`);
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
