import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// THE GRAPH STORE (block 1 of the file-system refactor, owner 2026-07-20).
//
// THE PROBLEM IT ENDS — TWO TRUTHS ABOUT ONE GRAPH. Until now the structure of an automation lived in two
// places at once: the folders `_nodes/<slug>/` plus `parentId` inside each meta.ts, AND the SQLite tables
// `automation_nodes` / `automation_diagram_edges`. Different readers read different halves:
//   · lib/executor.ts ordered the run from the DB (listNodes + listDiagramEdges);
//   · lib/graph-flow.ts judged the same graph from the FILES (meta.ts parentId + ports);
//   · the canvas drew the DB; the coding agent in its room saw only the files.
// So an edge dragged on the canvas never reached the files, an edge authored by the agent never reached the
// canvas, and the two drifted until something broke (the DB once held three "draft" nodes whose folders did
// not exist, making the automation permanently unrunnable).
//
// THE RULE NOW: `_data/graph.json` is the ONE source of the automation's structure.
//   · meta.ts  — what a node DOES (cuid, name, role, ioType, in/out ports, estDurationMs);
//   · graph.json — how nodes are CONNECTED and laid out (edges, order, coordinates, draft, status).
// `parentId` in meta.ts is retired: it was precisely the second source of edges. The canvas still receives
// `parent_cuid`, but it is now DERIVED (the first incoming edge) — a view, never a stored fact.
//
// WRITING: read-modify-write under a per-automation in-process mutex, then temp-file + rename, so a reader
// never observes a half-written graph and two concurrent edits never lose one another. The single-writer
// property that SQLite gave us for free is preserved deliberately, not by luck.
// ─────────────────────────────────────────────────────────────────────────────

export const GRAPH_FILE = "graph.json";

/** A node as stored on disk — deliberately readable: the owner and the coding agent both open this file. */
export type GraphNode = {
  cuid: string;
  slug: string;
  name: string;
  ord: number;
  x: number | null;
  y: number | null;
  draft: boolean;
  /** "draft" | "materialized" | "removed" — a removed node stays as a tombstone so version history resolves. */
  status: string;
  activeVersion: number;
  latestVersion: number;
};

export type GraphEdge = { from: string; to: string };

export type Graph = {
  version: 1;
  automation: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  updatedAt: string;
};

export const emptyGraph = (automation: string): Graph => ({
  version: 1, automation, nodes: [], edges: [], updatedAt: new Date().toISOString(),
});

export const graphPath = (projectDir: string) => join(projectDir, "_data", GRAPH_FILE);

/** Per-automation write chain: every mutation of one graph waits for the previous one to land. */
const chains = new Map<string, Promise<unknown>>();

export async function readGraph(projectDir: string, automation: string): Promise<Graph> {
  try {
    const raw = JSON.parse(await readFile(graphPath(projectDir), "utf8")) as Partial<Graph>;
    return {
      version: 1,
      automation: raw.automation ?? automation,
      nodes: Array.isArray(raw.nodes) ? (raw.nodes as GraphNode[]) : [],
      edges: Array.isArray(raw.edges) ? (raw.edges as GraphEdge[]) : [],
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return emptyGraph(automation);
  }
}

async function writeGraphAtomic(projectDir: string, graph: Graph): Promise<void> {
  graph.updatedAt = new Date().toISOString();
  const target = graphPath(projectDir);
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`;
  await mkdir(join(projectDir, "_data"), { recursive: true });
  await writeFile(tmp, `${JSON.stringify(graph, null, 2)}\n`, "utf8");
  await rename(tmp, target); // atomic on the same filesystem — readers see old or new, never half
}

/**
 * Mutate one automation's graph under its own lock. The mutator receives the current graph, changes it in
 * place (or returns a replacement) and may return a value that is handed back to the caller.
 */
export async function withGraph<T>(
  projectDir: string,
  automation: string,
  mutate: (g: Graph) => T | Promise<T>,
): Promise<T> {
  const prev = chains.get(automation) ?? Promise.resolve();
  const run = prev.then(async () => {
    const g = await readGraph(projectDir, automation);
    const result = await mutate(g);
    await writeGraphAtomic(projectDir, g);
    return result;
  });
  // The chain must survive a failing mutation, otherwise one error would deadlock every later write.
  chains.set(automation, run.catch(() => undefined));
  return run;
}

// ─── derived views ───────────────────────────────────────────────────────────

/** The layout parent of a node: the source of its FIRST incoming edge. Derived, never stored (that was the
 *  duplicate). Several edges into one node are normal — the canvas only needs one for column depth. */
export function derivedParent(graph: Graph, cuid: string): string | null {
  const alive = new Set(graph.nodes.filter((n) => n.status !== "removed").map((n) => n.cuid));
  const e = graph.edges.find((x) => x.to === cuid && alive.has(x.from));
  return e ? e.from : null;
}

/** Live nodes in display order. */
export const liveNodes = (graph: Graph): GraphNode[] =>
  graph.nodes.filter((n) => n.status !== "removed").sort((a, b) => a.ord - b.ord);

/** Edges whose BOTH endpoints are alive — the canvas and the executor must never see a dangling line. */
export const liveEdges = (graph: Graph): GraphEdge[] => {
  const alive = new Set(graph.nodes.filter((n) => n.status !== "removed").map((n) => n.cuid));
  return graph.edges.filter((e) => alive.has(e.from) && alive.has(e.to));
};

/** Every automation that has a graph file — for the cross-automation cuid lookup (nodeByCuid). */
export async function allGraphAutomations(projectsRootDir: string): Promise<string[]> {
  const out: string[] = [];
  const categories = await readdir(projectsRootDir, { withFileTypes: true }).catch(() => []);
  for (const c of categories) {
    if (!c.isDirectory() || c.name.startsWith("_")) continue;
    const slugs = await readdir(join(projectsRootDir, c.name), { withFileTypes: true }).catch(() => []);
    for (const s of slugs) {
      if (!s.isDirectory() || s.name.startsWith("_")) continue;
      out.push(`${c.name}/${s.name}`);
    }
  }
  return out;
}
