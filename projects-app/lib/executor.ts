import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import { resolveProject, listNodes, readNodeFunctionNames } from "@/lib/nodes";
import { listEdges } from "@/lib/edges";
import { readAutomationType } from "@/app/(projects)/projects/_shared/automation-type-reader";
import { EXECUTABLES } from "@/app/(projects)/projects/_generated/executables";
import { loadCompiledNode, hasCompiledNode } from "@/lib/node-compile";
import { missingParams } from "@/lib/activation";

// THE GENERAL NODE EXECUTOR (step 241) — the thing the whole product was missing: until now a node's
// functions.ts was proven to RUN for exactly one hard-coded node (step 238 Phase 3), and the "runner" the
// timeline used (lib/schedule.ts) only SIMULATED time passing. This walks the diagram of ANY automation and
// calls the real compiled functions.
//
// The design follows the doctrine, not the other way round:
//   • the DIAGRAM is the single source of truth — the executor walks _data/diagram.ts's nodes, in order, and
//     will not invent a step that is not there;
//   • a node's functions are DETERMINISTIC application code — the executor just calls them. AI happens only
//     inside a function that declares `externalAi` and calls the one shared helper (_shared/external-ai.ts);
//   • state is recorded in the tables that already exist (automation_runs / automation_run_nodes with their
//     JSON payload column) — no new schema (lesson 225 G4).
//
// HOW ARGUMENTS FLOW (the convention this step establishes, and the docs will state):
//   A run carries ONE context bag. A node's functions run in the declared order; each function receives its
//   `paramsIn` looked up BY NAME in that bag, and its return is written back into the bag — under the node's
//   single declared `out` key when it has exactly one (so `searchSources` → `sources`, and the next function
//   `dedupeSources(sources)` picks it up), and always under the function's own name as well. The bag starts
//   as the run's input (the trigger's payload, or a fork's parameters).

export type RunOutcome = {
  ok: boolean;
  runId: string;
  automation: string;
  instanceId: string | null;
  nodes: { node: string; status: "ok" | "fail" | "skipped"; ms: number; result?: unknown; error?: string }[];
  context: Record<string, unknown>;
  error?: string;
};

/** Why an automation may refuse to start. The owner's rule: never run a half-defined automation silently. */
export type ActivationRefusal =
  | { reason: "not-found" }
  | { reason: "has-drafts"; drafts: string[] }
  | { reason: "no-nodes" }
  | { reason: "not-executable"; nodes: string[] }
  | { reason: "no-fork" }                      // INSTANCED: a run IS a fork — without one there is nothing to run
  | { reason: "fork-without-params"; instanceId: string }
  | { reason: "missing-params"; instanceId: string; params: string[] }  // declared as required, not supplied
  | { reason: "no-edges" };                    // CHAINED: a chain that links nothing cannot be activated

export type ActivationCheck =
  | { ok: true; type: "stream" | "instanced" | "chained"; instanceId: string | null; params: Record<string, unknown> }
  | { ok: false; refusal: ActivationRefusal };

type Instance = { id: string; overrides: string; specialization: string; status: string };

/** A fork's PARAMETERS — what makes this run different (the article's keyword, …). They live in the instance's
 *  `overrides` JSON under `params` (the fork-activation entity, step 239, is where the owner designs them). */
function forkParams(inst: Instance): Record<string, unknown> {
  try {
    const o = JSON.parse(inst.overrides || "{}") as { params?: Record<string, unknown> };
    return o.params && typeof o.params === "object" ? o.params : {};
  } catch {
    return {};
  }
}

/** THE ACTIVATION GATES (owner's rule, step 241). An automation may only start when its TYPE's own
 *  preconditions hold — otherwise the caller gets a precise, machine-readable refusal, never a silent no-op. */
export async function canActivate(automation: string, instanceId?: string): Promise<ActivationCheck> {
  const proj = resolveProject(automation);
  if (!proj.ok) return { ok: false, refusal: { reason: "not-found" } };

  const type = await readAutomationType(proj.projectDir, proj.automation);
  const nodes = await listNodes(proj.automation);

  // THE TYPE'S OWN PRECONDITION COMES FIRST (owner's framing): it answers the more fundamental question —
  // "can this thing be activated AS WHAT IT IS at all?" An instanced automation without a parametrised fork,
  // or a chained one with nothing to chain to, is not a half-built automation: it is a category error, and
  // saying "some nodes are still drafts" would send the owner to fix the wrong thing.
  let chosenFork: string | null = null;
  let params: Record<string, unknown> = {};

  if (type === "instanced") {
    // A run of an instanced automation IS a fork: the Master is a template, never a runnable thing. Without a
    // fork there is nothing to run, and a fork without parameters would run the Master's defaults while
    // pretending to be a specific run — both are refusals, not defaults.
    const forks = (await db
      .prepare(`SELECT id, overrides, specialization, status FROM automation_instances WHERE automation = ? ORDER BY created_at ASC`)
      .all(proj.automation)) as Instance[];
    if (!forks.length) return { ok: false, refusal: { reason: "no-fork" } };
    // Named fork → that one, exactly (and it must carry parameters). No fork named → the OLDEST RUNNABLE one,
    // i.e. the first that actually carries parameters: a queue of forks is normal, and picking a param-less
    // one just because it was created first would refuse a run the workspace can perfectly well perform.
    // Only when NO fork has parameters is the refusal raised — naming the fork that needs them.
    const fork = instanceId
      ? forks.find((f) => f.id === instanceId)
      : forks.find((f) => Object.keys(forkParams(f)).length) ?? forks[0];
    if (!fork) return { ok: false, refusal: { reason: "no-fork" } };
    params = forkParams(fork);
    if (!Object.keys(params).length) {
      return { ok: false, refusal: { reason: "fork-without-params", instanceId: fork.id } };
    }
    // TYPED against the automation's OWN declaration (step 241 E3, _data/activation.ts): a parameter the
    // automation declares REQUIRED and the fork does not carry is named precisely, never defaulted silently.
    // The parameters themselves are custom to each automation — the product presumes none of them.
    const missing = await missingParams(proj.automation, params);
    if (missing.length) {
      return { ok: false, refusal: { reason: "missing-params", instanceId: fork.id, params: missing } };
    }
    chosenFork = fork.id;
  }

  if (type === "chained") {
    // A chained automation is a LINK in a chain: it exists to be wired to another automation. With no edge on
    // either side there is no chain — activating it would be a lie.
    const edges = (await listEdges()).filter(
      (e) => e.from_automation === proj.automation || e.to_automation === proj.automation,
    );
    if (!edges.length) return { ok: false, refusal: { reason: "no-edges" } };
  }

  // THEN the build checks, common to every type: the diagram must be BUILT and really executable. A draft node
  // is not code — running "around" it would execute a different automation than the one the diagram describes.
  const live = nodes.filter((n) => n.status !== "removed");
  if (!live.length) return { ok: false, refusal: { reason: "no-nodes" } };
  const drafts = live.filter((n) => n.draft === 1).map((n) => n.slug);
  if (drafts.length) return { ok: false, refusal: { reason: "has-drafts", drafts } };
  // Executable = a runtime artifact on disk (step 249 — materialize compiles it, no rebuild needed) OR an
  // entry in the build-time registry (the fallback for nodes last compiled by a full build).
  const missing: string[] = [];
  for (const n of live) {
    if (EXECUTABLES[`${proj.automation}:${n.slug}`]) continue;
    if (await hasCompiledNode(proj.projectDir, n.slug)) continue;
    missing.push(n.slug);
  }
  if (missing.length) return { ok: false, refusal: { reason: "not-executable", nodes: missing } };

  return { ok: true, type, instanceId: chosenFork, params };
}

/** The functions of a node, in the order its metadata declares them (the metadata is the contract; the module
 *  is the code). Reading the names from the source keeps ONE source of truth — the node's own FUNCTIONS[]. */
async function nodeFunctionsInOrder(projectDir: string, slug: string): Promise<string[]> {
  return readNodeFunctionNames(projectDir, slug);
}

/** A node's declared `out` keys, read from its meta.ts — where a function's return is written in the bag. */
async function nodeOutKeys(projectDir: string, slug: string): Promise<string[]> {
  const src = await readFile(join(projectDir, "_nodes", slug, "meta.ts"), "utf8").catch(() => "");
  const block = src.match(/out:\s*\{([^}]*)\}/);
  if (!block) return [];
  return [...block[1].matchAll(/(\w+)\s*:/g)].map((m) => m[1]);
}

/** A node's `paramsIn`, per function — so the executor knows what to hand each call, by name. */
async function nodeParamsIn(projectDir: string, slug: string): Promise<Record<string, string[]>> {
  const src = await readFile(join(projectDir, "_nodes", slug, "functions.ts"), "utf8").catch(() => "");
  const out: Record<string, string[]> = {};
  for (const m of src.matchAll(/name:\s*"(\w+)"\s*,\s*paramsIn:\s*\{([^}]*)\}/g)) {
    out[m[1]] = [...m[2].matchAll(/(\w+)\s*:/g)].map((p) => p[1]);
  }
  return out;
}

/** A node's declared role, read from its meta.ts (the detectChannel parser — one convention). */
async function nodeRole(projectDir: string, slug: string): Promise<string | undefined> {
  const src = await readFile(join(projectDir, "_nodes", slug, "meta.ts"), "utf8").catch(() => "");
  return src.match(/role:\s*["']([^"']+)["']/)?.[1];
}

async function nodeIoType(projectDir: string, slug: string): Promise<string | undefined> {
  const src = await readFile(join(projectDir, "_nodes", slug, "meta.ts"), "utf8").catch(() => "");
  return src.match(/ioType:\s*["']([^"']+)["']/)?.[1];
}

/** RUN an automation end to end: walk its diagram, call every node's real functions, record what happened. */
export async function executeAutomation(
  automation: string,
  input: Record<string, unknown> = {},
  opts?: { instanceId?: string },
): Promise<RunOutcome | { refusal: ActivationRefusal }> {
  const check = await canActivate(automation, opts?.instanceId);
  if (!check.ok) return { refusal: check.refusal };

  const proj = resolveProject(automation);
  if (!proj.ok) return { refusal: { reason: "not-found" } };

  // The run's context bag: the trigger's payload, plus a fork's own parameters (which win — they ARE what
  // makes this run specific).
  const ctx: Record<string, unknown> = { ...input, ...check.params };

  // TOPOLOGICAL ORDER (263.1, the Opus agent's true find on medicine/v2): DB order (ord) is BIRTH order,
  // not data-flow order — an input node added later sits after the midstream it feeds, so on that
  // surface's runs the midstream ran first and crashed on an empty bag before the input ever produced
  // it. Kahn over the live diagram edges, ord as the stable tiebreaker; inputs (no incoming edge) come
  // first by construction, a cycle falls back to ord (the flow gate refuses cycles upstream anyway).
  const unordered = (await listNodes(proj.automation)).filter((n) => n.status !== "removed" && n.draft === 0);
  const nodes = await (async () => {
    try {
      const { listDiagramEdges } = await import("@/lib/nodes");
      const edges = await listDiagramEdges(proj.automation);
      const alive = new Set(unordered.map((n) => n.cuid));
      const indeg = new Map(unordered.map((n) => [n.cuid, 0]));
      for (const e of edges) {
        if (alive.has(e.from_cuid) && alive.has(e.to_cuid)) indeg.set(e.to_cuid, (indeg.get(e.to_cuid) ?? 0) + 1);
      }
      const byOrd = [...unordered].sort((a, b) => a.ord - b.ord);
      const out: typeof unordered = [];
      const ready = byOrd.filter((n) => (indeg.get(n.cuid) ?? 0) === 0);
      const queued = new Set(ready.map((n) => n.cuid));
      while (ready.length) {
        const n = ready.shift()!;
        out.push(n);
        for (const e of edges) {
          if (e.from_cuid !== n.cuid || !alive.has(e.to_cuid)) continue;
          indeg.set(e.to_cuid, (indeg.get(e.to_cuid) ?? 0) - 1);
          if ((indeg.get(e.to_cuid) ?? 0) === 0 && !queued.has(e.to_cuid)) {
            queued.add(e.to_cuid);
            const t = byOrd.find((x) => x.cuid === e.to_cuid);
            if (t) ready.push(t);
          }
        }
        ready.sort((a, b) => a.ord - b.ord);
      }
      return out.length === unordered.length ? out : byOrd; // a cycle → honest ord fallback
    } catch {
      return unordered;
    }
  })();
  const runId = randomUUID();
  await db.prepare(
    `INSERT INTO automation_runs (id, automation, instance_id, current_node, status, started_at)
     VALUES (?, ?, ?, ?, 'running', datetime('now'))`,
  ).run(runId, proj.automation, check.instanceId, nodes[0]?.slug ?? null);

  const report: RunOutcome["nodes"] = [];
  let failed: string | undefined;

  // RUN PROVENANCE (263.1, owner's identity law): the whole node walk runs inside one async context that
  // publishes the run's TRUE channel (the ioType of the input node that actually fired — not a static
  // graph guess) and the currently running node. ingestToMemory reads both, so every memory this run
  // writes carries the full route of keys. One mutable object — later nodes see the channel the fed
  // input established.
  const prov: import("@/lib/vector-memory").RunProvenance = {};
  const { runProvenance } = await import("@/lib/vector-memory");
  await runProvenance.run(prov, async () => {
  for (const n of nodes) {
    prov.node = n.slug;
    const started = Date.now();
    await db.prepare(`UPDATE automation_runs SET current_node = ? WHERE id = ?`).run(n.slug, runId);
    const rowId = randomUUID();
    await db.prepare(
      `INSERT INTO automation_run_nodes (id, run_id, node_id, status) VALUES (?, ?, ?, 'running')`,
    ).run(rowId, runId, n.slug);

    try {
      // THE RUNTIME ARTIFACT WINS (step 249): a node materialized after the last build lives ONLY on disk
      // (functions.compiled.mjs), and a re-materialized node's fresh code must beat the stale bundled copy.
      // The registry stays as the fallback for nodes never compiled per-node.
      let mod = await loadCompiledNode(proj.projectDir, n.slug);
      if (!mod) {
        const load = EXECUTABLES[`${proj.automation}:${n.slug}`];
        if (!load) throw new Error(`node "${n.slug}" has no runtime artifact and is not in the executables registry`);
        mod = await load();
      }
      const order = await nodeFunctionsInOrder(proj.projectDir, n.slug);
      const paramsIn = await nodeParamsIn(proj.projectDir, n.slug);
      const outKeys = await nodeOutKeys(proj.projectDir, n.slug);

      // AN UNFED ALTERNATE ENTRY IS SKIPPED, NOT A CRASH (263.1 round 8, the owner's live failure): an
      // automation may declare SEVERAL input surfaces (control panel + a Telegram bot). A run triggered
      // through one surface carries only that surface's payload — the OTHER input node's trigger params
      // are simply absent from the bag. The old behavior called it anyway (undefined update →
      // "Cannot read properties of undefined" → the WHOLE run failed after every real node had worked).
      // Rule, deliberately narrow: only a role:"input" node, and only when EVERY param of its FIRST
      // function (the trigger contract) is absent. It reports honestly as "skipped" — never as "ok".
      const firstParams = paramsIn[order[0] ?? ""] ?? [];
      const role = await nodeRole(proj.projectDir, n.slug);
      if (firstParams.length && firstParams.every((p) => ctx[p] === undefined) && role === "input") {
        await db.prepare(`UPDATE automation_run_nodes SET status = 'skipped', payload = ? WHERE id = ?`)
          .run(JSON.stringify({ real: true, skipped: "unfed input surface", ms: 0 }), rowId);
        report.push({ node: n.slug, status: "skipped", ms: 0 });
        continue;
      }
      // The FED input node establishes the run's channel — its ioType IS the surface this run came
      // through (first fed input wins; a run rarely feeds two).
      if (role === "input" && prov.channel === undefined) {
        prov.channel = await nodeIoType(proj.projectDir, n.slug);
      }

      let last: unknown;
      for (const fname of order) {
        const fn = mod[fname];
        if (typeof fn !== "function") throw new Error(`function "${fname}" is declared but not exported by ${n.slug}/functions.ts`);
        const args = (paramsIn[fname] ?? []).map((p) => ctx[p]);
        last = await (fn as (...a: unknown[]) => unknown)(...args);
        // THE RETURN GOES BACK INTO THE BAG, three ways — each one earns its place:
        //   1. under the function's own name (so a later step can always address it explicitly);
        //   2. under the node's single declared `out` key, when it has exactly one — this is what lets
        //      searchSources' result arrive as `sources` for dedupeSources(sources);
        //   3. SPREAD, when the function returns a plain object — this is what carries `pageId` from
        //      createSitePage to schedulePublication(pageId, …) and publishNow(pageId).
        // (3) is not decoration: without it, a node with SEVERAL declared outputs silently passed `undefined`
        // between its own functions — the run reported "ok" while publish never actually published (caught on
        // the first real end-to-end run: the dashboard row stayed a draft). A step that does nothing must
        // never look like a step that worked.
        ctx[fname] = last;
        if (outKeys.length === 1) ctx[outKeys[0]] = last;
        if (last && typeof last === "object" && !Array.isArray(last)) {
          for (const [k, v] of Object.entries(last as Record<string, unknown>)) {
            if (v !== undefined) ctx[k] = v;
          }
        }
      }

      const ms = Date.now() - started;
      await db.prepare(`UPDATE automation_run_nodes SET status = 'ok', payload = ? WHERE id = ?`)
        .run(JSON.stringify({ real: true, result: last, ms }), rowId);
      report.push({ node: n.slug, status: "ok", ms, result: last });
    } catch (e) {
      const ms = Date.now() - started;
      const error = (e as Error).message ?? String(e);
      await db.prepare(`UPDATE automation_run_nodes SET status = 'fail', payload = ? WHERE id = ?`)
        .run(JSON.stringify({ real: true, error, ms }), rowId);
      report.push({ node: n.slug, status: "fail", ms, error });
      failed = error;
      break;   // the chain stops at the first failure — a later node would work on data that never arrived
    }
  }
  });

  await db.prepare(
    `UPDATE automation_runs SET status = ?, current_node = NULL, finished_at = datetime('now') WHERE id = ?`,
  ).run(failed ? "fail" : "done", runId);

  return {
    ok: !failed,
    runId,
    automation: proj.automation,
    instanceId: check.instanceId,
    nodes: report,
    context: ctx,
    error: failed,
  };
}
