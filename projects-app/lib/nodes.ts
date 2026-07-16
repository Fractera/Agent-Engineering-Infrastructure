import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { db } from "@/lib/db";

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
  const imports = [`import { assembleNode, type NodeContract } from "../../../_shared/node-contract";`];
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
