import { readdir, readFile, writeFile, mkdir, stat, rm } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { agentGateSecret } from "@/lib/agent-gate";
import { createNodeId } from "@/lib/cuid";
import { db } from "@/lib/db";
import { setTransport } from "@/lib/entity-store";
import { draftNodeStubFiles } from "@/app/(projects)/projects/_lib/draft-node-stub";

// Shared helpers for the Builder node API (step 224 L3). The DB table `automation_nodes` is the LIVE
// lightweight canvas index; the files under _nodes/<slug>/ are the executable truth (Model B). These
// helpers keep the two in sync: seed the index from the files, regenerate _data/diagram.ts from the index,
// and resolve/authorize a project.

const SLUG = /^[a-z][a-z0-9-]*$/;
const WRITE_ROLES = ["architect", "manager", "agent"];
const IP_MODE = process.env.FRACTERA_IP_NODOMAIN_MODE === "true";

export type NodeRow = {
  cuid: string; automation: string; slug: string; name: string; parent_cuid: string | null;
  ord: number; x: number | null; y: number | null; draft: number; active_version: number;
  latest_version: number; status: string;
};

export async function authorize(req: NextRequest): Promise<boolean> {
  if (IP_MODE) return true; // onboarding surface — open, like the other project routes
  // THE AGENT GATE (263.1): the in-room coding agent has no browser cookie — it presents the
  // per-server secret instead (see lib/agent-gate.ts for the trust model and the root cause).
  const gate = req.headers.get("x-fractera-agent-gate");
  if (gate && gate === (await agentGateSecret())) return true;
  const session = await getSession(req);
  return Boolean(session?.roles?.some((r) => WRITE_ROLES.includes(r)));
}

export function projectsRoot(): string {
  return join(process.cwd(), "app", "(projects)", "projects");
}

export function resolveProject(automation: string):
  | { ok: true; category: string; slug: string; automation: string; projectDir: string }
  | { ok: false; error: string } {
  const [category, slug] = (automation ?? "").split("/");
  if (!SLUG.test(category ?? "") || !SLUG.test(slug ?? "")) {
    return { ok: false, error: "invalid automation (expected category/slug)" };
  }
  return { ok: true, category, slug, automation: `${category}/${slug}`, projectDir: join(projectsRoot(), category, slug) };
}

async function exists(p: string): Promise<boolean> {
  try { await stat(p); return true; } catch { return false; }
}

const ident = (slug: string) => slug.replace(/[^a-z0-9]/gi, "_");

async function parseMeta(projectDir: string, slug: string): Promise<{ cuid: string; name: string; draft: boolean; parentId: string | null }> {
  const t = await readFile(join(projectDir, "_nodes", slug, "meta.ts"), "utf8").catch(() => "");
  const cuid = (t.match(/cuid:\s*["']([^"']+)["']/) ?? [])[1] ?? "";
  const name = (t.match(/name:\s*["']([^"']+)["']/) ?? [])[1] ?? slug;
  const draft = /["']?draft["']?\s*:\s*true/.test(t);
  // The node's declared diagram PARENT (NodeContract.parentId, 2026-07-16) — the slug of the node it
  // branches off. Resolved to the parent's cuid by the seeding second pass below.
  const parentId = (t.match(/parentId:\s*["']([^"']+)["']/) ?? [])[1] ?? null;
  return { cuid, name, draft, parentId };
}

/** Slugs in the order the diagram references them (fallback for seeding order). */
async function orderedSlugsFromDiagram(projectDir: string): Promise<string[]> {
  const t = await readFile(join(projectDir, "_data", "diagram.ts"), "utf8").catch(() => "");
  return [...new Set([...t.matchAll(/_nodes\/([a-z0-9-]+)\//g)].map((m) => m[1]))];
}

/** Seed the index from the files: any _nodes/<slug>/ not yet in the index is inserted (materialized unless
 *  meta says draft). Idempotent — the canvas can call it freely. */
export async function syncIndexFromFiles(automation: string, projectDir: string): Promise<void> {
  let folders: string[] = [];
  try {
    folders = (await readdir(join(projectDir, "_nodes"), { withFileTypes: true }))
      .filter((e) => e.isDirectory()).map((e) => e.name);
  } catch { return; }
  if (!folders.length) return;
  const existing = (await db.prepare(`SELECT slug FROM automation_nodes WHERE automation = ?`).all(automation)) as { slug: string }[];
  const known = new Set(existing.map((r) => r.slug));
  const order = await orderedSlugsFromDiagram(projectDir);
  const ordered = [...order.filter((s) => folders.includes(s)), ...folders.filter((s) => !order.includes(s))];
  for (let i = 0; i < ordered.length; i++) {
    const slug = ordered[i];
    if (known.has(slug)) continue;
    const { cuid, name, draft } = await parseMeta(projectDir, slug);
    if (!cuid) continue; // predates 224 (no cuid) — skip; nothing to join version history on
    await db.prepare(
      `INSERT OR IGNORE INTO automation_nodes
       (cuid, automation, slug, name, ord, draft, active_version, latest_version, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(cuid, automation, slug, name, i, draft ? 1 : 0, draft ? 0 : 1, draft ? 0 : 1, draft ? "draft" : "materialized");
  }

  // STEP 241 — TOMBSTONE THE DRIFT. The sync used to only ADD (folder → index) and never remove, so an index
  // row whose folder had vanished lived on forever. Real damage, found by the executor's gate: the reference
  // automation carried three phantom "draft" nodes with no folder on disk, which made it permanently
  // unrunnable ("some nodes are still drafts") for nodes that did not exist. The FILES are the truth (the
  // diagram invariant): a row with no folder is not a node, so it is tombstoned like any deleted one.
  for (const row of existing) {
    if (folders.includes(row.slug)) continue;
    await db.prepare(
      `UPDATE automation_nodes SET status = 'removed', updated_at = datetime('now')
       WHERE automation = ? AND slug = ? AND status != 'removed'`,
    ).run(automation, row.slug);
  }

  // SECOND PASS — resolve the declared diagram parents (2026-07-16, the branch fix). The insert above never
  // wrote parent_cuid, so every seeded node was a "root" and the live canvas drew a fresh frozen automation
  // as a LINEAR chain even when its meta.ts declared a branch (two condition nodes off one parent). Resolve
  // each folder's `parentId` (a slug) to that node's cuid and stamp it on rows that still have no parent —
  // never overwriting a parent the Builder set by hand (the "+" flow writes parent_cuid itself).
  const rows = (await db.prepare(
    `SELECT cuid, slug, parent_cuid FROM automation_nodes WHERE automation = ? AND status != 'removed'`,
  ).all(automation)) as { cuid: string; slug: string; parent_cuid: string | null }[];
  const cuidBySlug = new Map(rows.map((r) => [r.slug, r.cuid]));
  for (const row of rows) {
    if (row.parent_cuid) continue;
    const { parentId } = await parseMeta(projectDir, row.slug);
    const parentCuid = parentId ? cuidBySlug.get(parentId) : undefined;
    if (!parentCuid || parentCuid === row.cuid) continue;
    await db.prepare(
      `UPDATE automation_nodes SET parent_cuid = ?, updated_at = datetime('now') WHERE automation = ? AND slug = ?`,
    ).run(parentCuid, automation, row.slug);
  }

  // THIRD PASS — seed the diagram-edge LIST from the parents (owner 2026-07-16, the fan-in fix). Edges are
  // their own many-to-many table now (automation_diagram_edges); a fresh frozen automation's declared tree
  // lands there as its initial edges, and edge mode then adds/removes rows freely — several edges INTO one
  // node are normal. INSERT OR IGNORE keeps this idempotent on every canvas poll.
  const fresh = (await db.prepare(
    `SELECT cuid, parent_cuid FROM automation_nodes WHERE automation = ? AND status != 'removed'`,
  ).all(automation)) as { cuid: string; parent_cuid: string | null }[];
  for (const r of fresh) {
    if (!r.parent_cuid || r.parent_cuid === r.cuid) continue;
    await db.prepare(
      `INSERT OR IGNORE INTO automation_diagram_edges (automation, from_cuid, to_cuid) VALUES (?, ?, ?)`,
    ).run(automation, r.parent_cuid, r.cuid);
  }
}

/** The diagram's edge list (owner 2026-07-16) — live rows only (both endpoints alive). */
export async function listDiagramEdges(automation: string): Promise<{ from_cuid: string; to_cuid: string }[]> {
  return (await db.prepare(
    `SELECT e.from_cuid, e.to_cuid FROM automation_diagram_edges e
     JOIN automation_nodes a ON a.cuid = e.from_cuid AND a.status != 'removed'
     JOIN automation_nodes b ON b.cuid = e.to_cuid   AND b.status != 'removed'
     WHERE e.automation = ?`,
  ).all(automation)) as { from_cuid: string; to_cuid: string }[];
}

export async function listNodes(automation: string): Promise<NodeRow[]> {
  return (await db.prepare(
    `SELECT * FROM automation_nodes WHERE automation = ? AND status != 'removed' ORDER BY ord ASC`,
  ).all(automation)) as NodeRow[];
}

export async function nextOrd(automation: string): Promise<number> {
  const r = (await db.prepare(
    `SELECT COALESCE(MAX(ord), -1) + 1 AS n FROM automation_nodes WHERE automation = ? AND status != 'removed'`,
  ).get(automation)) as { n: number };
  return r.n;
}

export async function uniqueSlug(base: string, projectDir: string): Promise<string> {
  const root = (base || "node").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "node";
  let slug = root;
  let i = 2;
  while (await exists(join(projectDir, "_nodes", slug))) slug = `${root}-${i++}`;
  return slug;
}

/** Regenerate _data/diagram.ts from the ordered slugs. instruction.ts is imported only when present (a
 *  draft has none). This keeps the file topology (223.C.5 truth) in step with the index. */
export async function regenerateDiagram(projectDir: string, slugsInOrder: string[]): Promise<void> {
  // ROUTE-V3 (step 254.9): a route born with its own _types/ layer imports its OWN contract copy; a
  // pre-v3 route (no _types folder) keeps the platform import — both generations regenerate cleanly.
  const contractPath = (await exists(join(projectDir, "_types", "node-contract.ts")))
    ? "../_types/node-contract"
    : "../../../_shared/node-contract";
  const imports = [`import { assembleNode, type NodeContract } from "${contractPath}";`];
  const calls: string[] = [];
  for (const slug of slugsInOrder) {
    const id = ident(slug);
    imports.push(`import { META as m_${id} } from "../_nodes/${slug}/meta";`);
    imports.push(`import { FUNCTIONS as f_${id} } from "../_nodes/${slug}/functions";`);
    if (await exists(join(projectDir, "_nodes", slug, "instruction.ts"))) {
      imports.push(`import { INSTRUCTION as i_${id} } from "../_nodes/${slug}/instruction";`);
      calls.push(`  assembleNode(m_${id}, f_${id}, i_${id}),`);
    } else {
      calls.push(`  assembleNode(m_${id}, f_${id}),`);
    }
  }
  const body =
    `${imports.join("\n")}\n\n` +
    `// GENERATED by the Builder (step 224) — the Master diagram nodes, in order, composed from their\n` +
    `// co-located _nodes/<slug>/ folders. Regenerated on node create/delete/materialize; do not hand-edit.\n` +
    `export const DIAGRAM_NODES: NodeContract[] = [\n${calls.join("\n") || "  // no nodes yet"}\n];\n`;
  await mkdir(join(projectDir, "_data"), { recursive: true });
  await writeFile(join(projectDir, "_data", "diagram.ts"), body, "utf8");

  // STEP 241 — the executables registry is regenerated with the diagram, from the ONE place every caller
  // already goes through (create / materialize / rollback / delete / quiz). The two files must never disagree:
  // the diagram says WHICH nodes exist, the registry says HOW to call them. Dynamic import: the generator
  // imports lazily so this module keeps no import cycle with lib/executables.ts.
  const { regenerateExecutables } = await import("@/lib/executables");
  await regenerateExecutables().catch(() => { /* a failed regen must not break the write above */ });
}

/** The ordered slugs of the live (non-removed) nodes — used to regenerate the diagram. */
export async function liveSlugsInOrder(automation: string): Promise<string[]> {
  return (await listNodes(automation)).map((n) => n.slug);
}

export async function nodeByCuid(cuid: string): Promise<NodeRow | undefined> {
  return (await db.prepare(`SELECT * FROM automation_nodes WHERE cuid = ?`).get(cuid)) as NodeRow | undefined;
}

/** A node's typed PORTS — its declared inputs and outputs, parsed from meta.ts (step 225 G5). An AI wiring
 *  the workspace must SEE what a node consumes and produces to choose link endpoints sensibly instead of
 *  guessing; this is what makes a link programmable by an agent, not only by a human reading the code. */
export async function readNodePorts(projectDir: string, slug: string): Promise<{ in: string[]; out: string[] }> {
  const t = await readFile(join(projectDir, "_nodes", slug, "meta.ts"), "utf8").catch(() => "");
  const block = (key: "in" | "out") => {
    const m = t.match(new RegExp(`\\b${key}\\s*:\\s*\\{([^}]*)\\}`));
    if (!m) return [];
    return [...m[1].matchAll(/(\w+)\s*:\s*["']([^"']+)["']/g)].map((x) => `${x[1]}: ${x[2]}`);
  };
  return { in: block("in"), out: block("out") };
}

/** A node's ESTIMATED process time in ms (step 230), parsed from meta.ts. The model writes estDurationMs
 *  when the node is designed; absent → the default. Read from the file (Model B) — never a column on the
 *  existing automation_nodes table (lesson 225 G4). */
export async function readNodeDuration(projectDir: string, slug: string): Promise<number> {
  const t = await readFile(join(projectDir, "_nodes", slug, "meta.ts"), "utf8").catch(() => "");
  const m = t.match(/estDurationMs\s*:\s*(\d+)/);
  const v = m ? Number(m[1]) : NaN;
  return Number.isFinite(v) && v > 0 ? v : 60_000;
}

/** How many functions a node declares (step 230) — used to prorate a fork's duration when some of the
 *  node's functions are disabled by an override (each disabled function subtracts its share of the time). */
export async function readNodeFunctionCount(projectDir: string, slug: string): Promise<number> {
  const t = await readFile(join(projectDir, "_nodes", slug, "functions.ts"), "utf8").catch(() => "");
  const n = (t.match(/name\s*:/g) ?? []).length;
  return n > 0 ? n : 1;
}

/** The node's declared function NAMES, in the order its FUNCTIONS[] metadata lists them (step 241). This is
 *  the execution order: the metadata is the contract, the module is the code, and the executor calls the
 *  exported function of each declared name in turn. Reading it from the node's own file keeps ONE source of
 *  truth — a function that is exported but not declared is not executed. */
export async function readNodeFunctionNames(projectDir: string, slug: string): Promise<string[]> {
  const t = await readFile(join(projectDir, "_nodes", slug, "functions.ts"), "utf8").catch(() => "");
  return [...t.matchAll(/name:\s*"(\w+)"/g)].map((m) => m[1]);
}

/** A node's co-located source files (for a version snapshot / rollback). Missing files read as "". */
export async function readNodeFiles(projectDir: string, slug: string): Promise<{ meta: string; functions: string; instruction: string; spec: string }> {
  const dir = join(projectDir, "_nodes", slug);
  const read = (f: string) => readFile(join(dir, f), "utf8").catch(() => "");
  return { meta: await read("meta.ts"), functions: await read("functions.ts"), instruction: await read("instruction.ts"), spec: await read("spec.md") };
}

/** True when functions.ts has no functions yet (empty array or empty file) — a node cannot materialize
 *  until it has real functions. */
export function functionsAreEmpty(src: string): boolean {
  return src.trim() === "" || /FUNCTIONS[^=]*=\s*\[\s*\]/.test(src);
}

/** Remove the `draft: true` line from a meta.ts source — the file becomes a materialized node's meta. */
export function stripDraftFlag(metaText: string): string {
  return metaText.replace(/\n[^\n]*["']?draft["']?\s*:\s*true\s*,?/, "");
}

// ─── Extracted write paths (step 250) — the API routes AND the in-product develop agent's tool executors
// call these SAME functions in-process, so the two entry points can never drift. Each function assumes the
// caller already authorized the request and resolved the project (resolveProject = the scoping boundary).

export type ResolvedProject = { category: string; slug: string; automation: string; projectDir: string };

/** Insert or replace one simple string field of a meta.ts source (role / ioType / parentId). value === null
 *  removes the field. Placed right after the `name:` line when absent, so the file stays a hand-formatted
 *  literal like every authored meta.ts. */
export function upsertMetaField(src: string, key: string, value: string | null): string {
  const line = new RegExp(`^\\s*${key}:\\s*["'][^"']*["'],?\\s*\\n`, "m");
  if (value === null) return src.replace(line, "");
  const rendered = `  ${key}: ${JSON.stringify(value)},\n`;
  if (line.test(src)) return src.replace(line, rendered);
  return src.replace(/^(\s*name:\s*["'][^"']*["'],?\s*\n)/m, `$1${rendered}`);
}

/** Create a DRAFT node (extracted from nodes/create, step 250): cuid, co-located stub files, index row,
 *  diagram regen. A child is inserted RIGHT AFTER its parent so the diagram order follows the tree. */
export async function createDraftNode(
  proj: ResolvedProject,
  opts: { name: string; spec: string; parentCuid: string | null },
): Promise<{ cuid: string; slug: string; name: string }> {
  const name = opts.name.trim() || "New node";
  await syncIndexFromFiles(proj.automation, proj.projectDir);
  const slug = await uniqueSlug(name, proj.projectDir);
  const cuid = createNodeId();

  let ord: number;
  if (opts.parentCuid) {
    const p = (await db.prepare(`SELECT ord FROM automation_nodes WHERE cuid = ?`).get(opts.parentCuid)) as { ord: number } | undefined;
    if (p) {
      ord = p.ord + 1;
      await db.prepare(
        `UPDATE automation_nodes SET ord = ord + 1 WHERE automation = ? AND ord >= ? AND status != 'removed'`,
      ).run(proj.automation, ord);
    } else {
      ord = await nextOrd(proj.automation);
    }
  } else {
    ord = await nextOrd(proj.automation);
  }

  const nodeDir = join(proj.projectDir, "_nodes", slug);
  await mkdir(nodeDir, { recursive: true });
  const hasOwnTypes = await exists(join(proj.projectDir, "_types", "node-contract.ts"));
  for (const [rel, content] of Object.entries(draftNodeStubFiles({ cuid, slug, name, spec: opts.spec, hasOwnTypes }))) {
    await writeFile(join(nodeDir, rel), content, "utf8");
  }

  await db.prepare(
    `INSERT INTO automation_nodes
     (cuid, automation, slug, name, parent_cuid, ord, draft, active_version, latest_version, status)
     VALUES (?, ?, ?, ?, ?, ?, 1, 0, 0, 'draft')`,
  ).run(cuid, proj.automation, slug, name, opts.parentCuid, ord);

  await regenerateDiagram(proj.projectDir, await liveSlugsInOrder(proj.automation));
  return { cuid, slug, name };
}

/** Edit a node's panel fields (extracted from PATCH nodes/[cuid], step 250). `stage` controls the step-240
 *  side effect: an OWNER editing a live node's instruction stages an optimization request (true, the route's
 *  behavior); the develop agent editing the same field must NOT restage its own work (false). Returns an
 *  error string instead of throwing so the tool executor can hand it to the model. */
export async function patchNode(
  proj: ResolvedProject,
  row: NodeRow,
  body: {
    spec?: string; instruction?: string; name?: string; role?: string; ioType?: string;
    parentCuid?: string | null;
  },
  stage: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const nodeDir = join(proj.projectDir, "_nodes", row.slug);

  if (typeof body.role === "string" || typeof body.ioType === "string") {
    const metaPath = join(nodeDir, "meta.ts");
    let meta = await readFile(metaPath, "utf8").catch(() => "");
    if (meta) {
      if (typeof body.role === "string" && body.role.trim()) meta = upsertMetaField(meta, "role", body.role.trim());
      if (typeof body.ioType === "string") meta = upsertMetaField(meta, "ioType", body.ioType.trim() || null);
      await writeFile(metaPath, meta, "utf8");
    }
  }
  if (body.parentCuid !== undefined) {
    const parentCuid = body.parentCuid === null ? null : String(body.parentCuid);
    if (parentCuid === row.cuid) return { ok: false, error: "a node cannot be its own parent" };
    let parentSlug: string | null = null;
    if (parentCuid) {
      const p = await nodeByCuid(parentCuid);
      if (!p || p.automation !== row.automation || p.status === "removed") {
        return { ok: false, error: "parent node not found in this automation" };
      }
      parentSlug = p.slug;
    }
    await db.prepare(`UPDATE automation_nodes SET parent_cuid = ?, updated_at = datetime('now') WHERE cuid = ?`).run(parentCuid, row.cuid);
    const metaPath = join(nodeDir, "meta.ts");
    const meta = await readFile(metaPath, "utf8").catch(() => "");
    if (meta) await writeFile(metaPath, upsertMetaField(meta, "parentId", parentSlug), "utf8");
  }

  if (typeof body.spec === "string") {
    await writeFile(join(nodeDir, "spec.md"), `${body.spec.trim()}\n`, "utf8");
  }
  if (typeof body.instruction === "string") {
    await writeFile(join(nodeDir, "instruction.ts"), `export const INSTRUCTION = ${JSON.stringify(body.instruction)};\n`, "utf8");
    if (stage && row.draft === 0) {
      await setTransport(row.automation, "node", row.cuid, { instruction: body.instruction, spec: "" });
    }
  }
  if (typeof body.name === "string" && body.name.trim()) {
    await db.prepare(`UPDATE automation_nodes SET name = ?, updated_at = datetime('now') WHERE cuid = ?`).run(body.name.trim(), row.cuid);
  }
  return { ok: true };
}

/** Soft-delete a node (extracted from DELETE nodes/[cuid], step 250): tombstone the row, purge its diagram
 *  edges, remove the folder, regenerate the diagram. */
export async function softDeleteNode(proj: ResolvedProject, row: NodeRow): Promise<void> {
  await db.prepare(`UPDATE automation_nodes SET status = 'removed', updated_at = datetime('now') WHERE cuid = ?`).run(row.cuid);
  await db.prepare(`DELETE FROM automation_diagram_edges WHERE from_cuid = ? OR to_cuid = ?`).run(row.cuid, row.cuid);
  await rm(join(proj.projectDir, "_nodes", row.slug), { recursive: true, force: true });
  await regenerateDiagram(proj.projectDir, await liveSlugsInOrder(row.automation));
}

/** Connect / disconnect one diagram edge (extracted from nodes/edges, step 250). Deliberately NO
 *  "can this connect?" validation beyond self-loop (the owner's explicit ruling). parent_cuid stays a
 *  LAYOUT hint: connect stamps it on an orphan target, remove clears it only when it pointed here. */
export async function writeDiagramEdge(
  automation: string,
  fromCuid: string,
  toCuid: string,
  remove: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!fromCuid || !toCuid) return { ok: false, error: "fromCuid and toCuid required" };
  if (fromCuid === toCuid) return { ok: false, error: "a node cannot link to itself" };

  if (remove) {
    await db.prepare(
      `DELETE FROM automation_diagram_edges WHERE automation = ? AND from_cuid = ? AND to_cuid = ?`,
    ).run(automation, fromCuid, toCuid);
    await db.prepare(
      `UPDATE automation_nodes SET parent_cuid = NULL, updated_at = datetime('now')
       WHERE cuid = ? AND parent_cuid = ?`,
    ).run(toCuid, fromCuid);
    return { ok: true };
  }

  await db.prepare(
    `INSERT OR IGNORE INTO automation_diagram_edges (automation, from_cuid, to_cuid) VALUES (?, ?, ?)`,
  ).run(automation, fromCuid, toCuid);
  await db.prepare(
    `UPDATE automation_nodes SET parent_cuid = ?, updated_at = datetime('now')
     WHERE cuid = ? AND parent_cuid IS NULL`,
  ).run(fromCuid, toCuid);
  return { ok: true };
}

/** Detached rebuild + reload after a change to the built files (materialize / rollback). Serialized with
 *  flock so two rebuilds never run concurrently (a corrupted .next was the risk); best-effort. */
export function scheduleRebuild(): void {
  try {
    spawn(
      "sh",
      ["-c", "cd /opt/fractera/projects-app && ( flock 9; npm run build && pm2 reload fractera-projects ) 9>/tmp/projects-build.lock"],
      { detached: true, stdio: "ignore" },
    ).unref();
  } catch { /* best-effort — the files/DB are already updated */ }
}
