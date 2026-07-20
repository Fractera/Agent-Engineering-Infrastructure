import { readdir, readFile, writeFile, mkdir, stat, rm } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { agentGateSecret } from "@/lib/agent-gate";
import { createNodeId } from "@/lib/cuid";
import { setTransport } from "@/lib/entity-store";
import {
  allGraphAutomations, derivedParent, liveEdges, liveNodes, readGraph, withGraph,
  type Graph, type GraphNode,
} from "@/lib/graph-store";
import { draftNodeStubFiles } from "@/app/(projects)/projects/_lib/draft-node-stub";

// Shared helpers for the Builder node API (step 224 L3), rewritten onto the FILE-SYSTEM graph store
// (owner 2026-07-20). There is no longer a DB index to keep in sync with the files: `_data/graph.json` IS
// the structure (nodes, edges, order, layout, status) and `_nodes/<slug>/` IS the behaviour. Every function
// below keeps its previous signature and NodeRow shape on purpose — the ~15 callers (node APIs, quiz, clone,
// delete, materialize, the canvas through its API) needed no edits.

const SLUG = /^[a-z][a-z0-9-]*$/;
const WRITE_ROLES = ["architect", "manager", "agent"];
const IP_MODE = process.env.FRACTERA_IP_NODOMAIN_MODE === "true";

/** The shape every caller already knows. `parent_cuid` is DERIVED from the edges now (the first incoming edge) —
 *  it is a layout hint for the canvas, never a stored second source of the topology. */
export type NodeRow = {
  cuid: string; automation: string; slug: string; name: string; parent_cuid: string | null;
  ord: number; x: number | null; y: number | null; draft: number; active_version: number;
  latest_version: number; status: string;
};

/** Disk shape → the row shape the callers expect. */
function toRow(automation: string, g: Graph, n: GraphNode): NodeRow {
  return {
    cuid: n.cuid, automation, slug: n.slug, name: n.name,
    parent_cuid: derivedParent(g, n.cuid),
    ord: n.ord, x: n.x ?? null, y: n.y ?? null,
    draft: n.draft ? 1 : 0,
    active_version: n.activeVersion ?? 0, latest_version: n.latestVersion ?? 0,
    status: n.status,
  };
}

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

/** Seed / reconcile `_data/graph.json` from the folders on disk. Idempotent — the canvas calls it freely.
 *
 *  THIS IS ALSO THE MIGRATION. An automation created before the file-system refactor has no graph.json: on
 *  the first call its nodes are read from the `_nodes/` folders and its edges from the retired `parentId`
 *  declarations, and from then on the file is the truth. `parentId` is consulted ONLY for a node the graph
 *  has never seen — otherwise an edge the owner deleted on the canvas would resurrect on the next poll
 *  (the old DB seeding did exactly that, because it re-ran INSERT OR IGNORE forever).
 *
 *  It also TOMBSTONES drift in the other direction: a node whose folder has vanished is marked removed. The
 *  files are the truth, and a node with no folder is not a node — that bug once left three phantom drafts in
 *  the index and made the automation permanently unrunnable ("some nodes are still drafts"). */
export async function syncIndexFromFiles(automation: string, projectDir: string): Promise<void> {
  let folders: string[] = [];
  try {
    folders = (await readdir(join(projectDir, "_nodes"), { withFileTypes: true }))
      .filter((e) => e.isDirectory()).map((e) => e.name);
  } catch { return; }
  if (!folders.length) return;

  // Parse every folder's meta.ts OUTSIDE the lock — file reads must not serialize behind other writers.
  const metas = new Map<string, { cuid: string; name: string; draft: boolean; parentId: string | null }>();
  for (const slug of folders) metas.set(slug, await parseMeta(projectDir, slug));
  const diagramOrder = await orderedSlugsFromDiagram(projectDir);

  await withGraph(projectDir, automation, (g) => {
    const known = new Set(g.nodes.map((n) => n.slug));
    const ordered = [
      ...diagramOrder.filter((s) => folders.includes(s)),
      ...folders.filter((s) => !diagramOrder.includes(s)),
    ];

    // 1. NEW FOLDERS → nodes. A folder that appeared without passing through the Builder (the coding
    //    agent's gated apply is the usual author) joins the graph here.
    const born: string[] = [];
    let nextOrdinal = g.nodes.reduce((m, n) => Math.max(m, n.ord), -1) + 1;
    for (const slug of ordered) {
      if (known.has(slug)) continue;
      const m = metas.get(slug)!;
      if (!m.cuid) continue; // predates the cuid convention — nothing to hang history on
      g.nodes.push({
        cuid: m.cuid, slug, name: m.name, ord: nextOrdinal++,
        x: null, y: null, draft: m.draft, status: m.draft ? "draft" : "materialized",
        activeVersion: m.draft ? 0 : 1, latestVersion: m.draft ? 0 : 1,
      });
      born.push(slug);
    }

    // 2. VANISHED FOLDERS → tombstones.
    for (const n of g.nodes) {
      if (n.status === "removed" || folders.includes(n.slug)) continue;
      n.status = "removed";
    }

    // 3. DECLARED PARENTS → edges, for newly born nodes only (see the note above about resurrection).
    if (born.length) {
      const cuidBySlug = new Map(g.nodes.map((n) => [n.slug, n.cuid]));
      for (const slug of born) {
        const parentId = metas.get(slug)?.parentId;
        if (!parentId) continue;
        const from = cuidBySlug.get(parentId);
        const to = cuidBySlug.get(slug);
        if (!from || !to || from === to) continue;
        if (g.edges.some((e) => e.from === from && e.to === to)) continue;
        g.edges.push({ from, to });
      }
    }
  });
}

/** The diagram's edge list — live rows only (both endpoints alive). */
export async function listDiagramEdges(automation: string): Promise<{ from_cuid: string; to_cuid: string }[]> {
  const proj = resolveProject(automation);
  if (!proj.ok) return [];
  const g = await readGraph(proj.projectDir, automation);
  return liveEdges(g).map((e) => ({ from_cuid: e.from, to_cuid: e.to }));
}

export async function listNodes(automation: string): Promise<NodeRow[]> {
  const proj = resolveProject(automation);
  if (!proj.ok) return [];
  const g = await readGraph(proj.projectDir, automation);
  return liveNodes(g).map((n) => toRow(automation, g, n));
}

export async function nextOrd(automation: string): Promise<number> {
  return (await listNodes(automation)).reduce((m, n) => Math.max(m, n.ord), -1) + 1;
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

/** THE TWO-TRUTHS SEAM (263.1 round 12, owner's live find on medicine/v2). The canvas label is the DB row
 *  (`automation_nodes.name`, polled every 3s) while the node's authored identity is disk (`meta.ts` name) —
 *  a gated apply rewrites only disk, so a rename by the coding agent NEVER reached the canvas (old names
 *  outside, new names inside the panel, and no rebuild can help because the poll wins over the build-time
 *  prop). This sync carries the disk truth into the DB row wherever they disagree; call it after any flow
 *  that rewrites meta.ts outside the Builder (apply is the known one). */
export async function syncNodeNamesFromMeta(automation: string, projectDir: string): Promise<string[]> {
  const names = new Map<string, string>();
  for (const n of await listNodes(automation)) {
    const t = await readFile(join(projectDir, "_nodes", n.slug, "meta.ts"), "utf8").catch(() => "");
    const m = t.match(/\bname\s*:\s*["']([^"']+)["']/);
    if (m && m[1] && m[1] !== n.name) names.set(n.cuid, m[1]);
  }
  if (!names.size) return [];
  return withGraph(projectDir, automation, (g) => {
    const renamed: string[] = [];
    for (const n of g.nodes) {
      const fresh = names.get(n.cuid);
      if (!fresh) continue;
      renamed.push(`${n.slug} → ${fresh}`);
      n.name = fresh;
    }
    return renamed;
  });
}

/** THE ORPHAN-EDGE SYNC (263.1 round 13, owner's "yes ofcourse"). A gated apply materializes nodes on disk
 *  but wrote no edge into the graph, so an agent-added alternative input sat VISUALLY alone on
 *  the canvas forever (medicine/v2 telegram input) even though the executor's bag semantics had it fully
 *  wired. This derives the missing line the same conservative way lib/graph-flow.ts reasons: ONLY for a node
 *  no edge row touches at all (never fights topology the owner drew or deleted), and only on an exact
 *  contract match — every out key consumed by one node's ins (producer → that consumer), or every in key
 *  produced by one node's outs (that producer → node). INSERT OR IGNORE keeps it idempotent. */
export async function syncOrphanEdgesFromPorts(automation: string, projectDir: string): Promise<string[]> {
  const nodes = await listNodes(automation);
  if (nodes.length < 2) return [];
  const edges = await listDiagramEdges(automation);
  const touched = new Set<string>();
  for (const e of edges) { touched.add(e.from_cuid); touched.add(e.to_cuid); }
  const ports = new Map<string, { in: string[]; out: string[] }>();
  for (const n of nodes) ports.set(n.cuid, await readNodePorts(projectDir, n.slug));
  const names = (l: string[]) => l.map((s) => s.split(":")[0].trim()).filter(Boolean);
  const pending: { from: string; to: string }[] = [];
  const link = async (fromCuid: string, toCuid: string) => { pending.push({ from: fromCuid, to: toCuid }); };
  const added: string[] = [];
  for (const n of nodes) {
    if (touched.has(n.cuid)) continue;
    const mine = ports.get(n.cuid)!;
    const out = names(mine.out);
    if (out.length) {
      const consumer = nodes.find(
        (c) => c.cuid !== n.cuid && out.every((k) => names(ports.get(c.cuid)!.in).includes(k)),
      );
      if (consumer) {
        await link(n.cuid, consumer.cuid);
        added.push(`${n.slug} → ${consumer.slug}`);
        continue;
      }
    }
    const inn = names(mine.in);
    if (inn.length) {
      const producer = nodes.find(
        (p) => p.cuid !== n.cuid && inn.every((k) => names(ports.get(p.cuid)!.out).includes(k)),
      );
      if (producer) {
        await link(producer.cuid, n.cuid);
        added.push(`${producer.slug} → ${n.slug}`);
      }
    }
  }
  if (pending.length) {
    const proj = resolveProject(automation);
    if (proj.ok) {
      await withGraph(proj.projectDir, automation, (g) => {
        for (const p of pending) {
          if (g.edges.some((e) => e.from === p.from && e.to === p.to)) continue;
          g.edges.push({ from: p.from, to: p.to });
        }
      });
    }
  }
  return added;
}

/** Find a node by cuid ANYWHERE in the workspace. The DB answered this with one indexed lookup; the file
 *  store scans the graph files instead — a handful of automations, each a small JSON, and only the node
 *  APIs (which already hit the disk for meta.ts) take this path. */
export async function nodeByCuid(cuid: string): Promise<NodeRow | undefined> {
  for (const automation of await allGraphAutomations(projectsRoot())) {
    const proj = resolveProject(automation);
    if (!proj.ok) continue;
    const g = await readGraph(proj.projectDir, automation);
    const n = g.nodes.find((x) => x.cuid === cuid);
    if (n) return toRow(automation, g, n);
  }
  return undefined;
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

  const nodeDir = join(proj.projectDir, "_nodes", slug);
  await mkdir(nodeDir, { recursive: true });
  const hasOwnTypes = await exists(join(proj.projectDir, "_types", "node-contract.ts"));
  for (const [rel, content] of Object.entries(draftNodeStubFiles({ cuid, slug, name, spec: opts.spec, hasOwnTypes }))) {
    await writeFile(join(nodeDir, rel), content, "utf8");
  }

  // A child is inserted RIGHT AFTER its parent so the diagram order follows the tree; the edge to the
  // parent is written in the SAME transaction as the node, so the graph is never momentarily inconsistent.
  await withGraph(proj.projectDir, proj.automation, (g) => {
    const parent = opts.parentCuid ? g.nodes.find((n) => n.cuid === opts.parentCuid && n.status !== "removed") : undefined;
    let ord: number;
    if (parent) {
      ord = parent.ord + 1;
      for (const n of g.nodes) if (n.status !== "removed" && n.ord >= ord) n.ord += 1;
    } else {
      ord = g.nodes.filter((n) => n.status !== "removed").reduce((m, n) => Math.max(m, n.ord), -1) + 1;
    }
    g.nodes.push({
      cuid, slug, name, ord, x: null, y: null,
      draft: true, status: "draft", activeVersion: 0, latestVersion: 0,
    });
    if (parent) g.edges.push({ from: parent.cuid, to: cuid });
  });

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
    if (parentCuid) {
      const p = await nodeByCuid(parentCuid);
      if (!p || p.automation !== row.automation || p.status === "removed") {
        return { ok: false, error: "parent node not found in this automation" };
      }
    }
    // "Set the parent" is now exactly "replace the incoming edges" — there is no separate parent field to
    // keep in step, and meta.ts is no longer touched (parentId is retired: it was the duplicate source).
    await withGraph(proj.projectDir, row.automation, (g) => {
      g.edges = g.edges.filter((e) => e.to !== row.cuid);
      if (parentCuid) g.edges.push({ from: parentCuid, to: row.cuid });
    });
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
    const fresh = body.name.trim();
    await withGraph(proj.projectDir, row.automation, (g) => {
      const n = g.nodes.find((x) => x.cuid === row.cuid);
      if (n) n.name = fresh;
    });
  }
  return { ok: true };
}

/** Soft-delete a node (extracted from DELETE nodes/[cuid], step 250): tombstone the row, purge its diagram
 *  edges, remove the folder, regenerate the diagram. */
export async function softDeleteNode(proj: ResolvedProject, row: NodeRow): Promise<void> {
  await withGraph(proj.projectDir, row.automation, (g) => {
    const n = g.nodes.find((x) => x.cuid === row.cuid);
    if (n) n.status = "removed";
    g.edges = g.edges.filter((e) => e.from !== row.cuid && e.to !== row.cuid);
  });
  await rm(join(proj.projectDir, "_nodes", row.slug), { recursive: true, force: true });
  await regenerateDiagram(proj.projectDir, await liveSlugsInOrder(row.automation));
}

/** Connect / disconnect one diagram edge (extracted from nodes/edges, step 250). Deliberately NO
 *  "can this connect?" validation beyond the self-loop (the owner's explicit ruling). The old version also
 *  maintained `parent_cuid` alongside the edge row — that second write is gone: the parent IS the edge now. */
export async function writeDiagramEdge(
  automation: string,
  fromCuid: string,
  toCuid: string,
  remove: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!fromCuid || !toCuid) return { ok: false, error: "fromCuid and toCuid required" };
  if (fromCuid === toCuid) return { ok: false, error: "a node cannot link to itself" };
  const proj = resolveProject(automation);
  if (!proj.ok) return { ok: false, error: proj.error };

  await withGraph(proj.projectDir, automation, (g) => {
    if (remove) {
      g.edges = g.edges.filter((e) => !(e.from === fromCuid && e.to === toCuid));
      return;
    }
    if (!g.edges.some((e) => e.from === fromCuid && e.to === toCuid)) g.edges.push({ from: fromCuid, to: toCuid });
  });
  return { ok: true };
}

/** Patch the graph-owned fields of ONE node (status/draft/version pointers/name/position). The single door
 *  every caller that used to run `UPDATE automation_nodes SET …` goes through now — materialize, rollback,
 *  the layout save and the quiz. Keeping it here means no route imports the store directly. */
export async function patchGraphNode(
  automation: string,
  cuid: string,
  patch: Partial<Pick<GraphNode, "name" | "x" | "y" | "draft" | "status" | "activeVersion" | "latestVersion">>,
): Promise<void> {
  const proj = resolveProject(automation);
  if (!proj.ok) return;
  await withGraph(proj.projectDir, automation, (g) => {
    const n = g.nodes.find((x) => x.cuid === cuid);
    if (n) Object.assign(n, patch);
  });
}

/** Save many canvas positions in ONE write (the Builder posts the whole layout at once). */
export async function saveNodeLayout(
  automation: string,
  positions: { cuid: string; x: number; y: number }[],
): Promise<number> {
  const proj = resolveProject(automation);
  if (!proj.ok) return 0;
  return withGraph(proj.projectDir, automation, (g) => {
    let saved = 0;
    for (const p of positions) {
      const n = g.nodes.find((x) => x.cuid === p.cuid);
      if (!n) continue;
      n.x = p.x; n.y = p.y; saved++;
    }
    return saved;
  });
}

/** Append a node that already exists on disk (the quiz writes its files itself, then registers it here). */
export async function registerNode(
  automation: string,
  node: { cuid: string; slug: string; name: string; draft: boolean },
): Promise<void> {
  const proj = resolveProject(automation);
  if (!proj.ok) return;
  await withGraph(proj.projectDir, automation, (g) => {
    if (g.nodes.some((n) => n.cuid === node.cuid)) return;
    const ord = g.nodes.filter((n) => n.status !== "removed").reduce((m, n) => Math.max(m, n.ord), -1) + 1;
    g.nodes.push({
      cuid: node.cuid, slug: node.slug, name: node.name, ord, x: null, y: null,
      draft: node.draft, status: node.draft ? "draft" : "materialized",
      activeVersion: node.draft ? 0 : 1, latestVersion: node.draft ? 0 : 1,
    });
  });
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
