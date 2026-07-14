import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import { resolveProject, listNodes, readNodeFunctionNames } from "@/lib/nodes";
import { listEdges } from "@/lib/edges";
import { readAutomationType } from "@/app/(projects)/projects/_shared/automation-type-reader";
import { EXECUTABLES } from "@/app/(projects)/projects/_generated/executables";

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
  nodes: { node: string; status: "ok" | "fail"; ms: number; result?: unknown; error?: string }[];
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
  const missing = live.filter((n) => !EXECUTABLES[`${proj.automation}:${n.slug}`]).map((n) => n.slug);
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

  const nodes = (await listNodes(proj.automation)).filter((n) => n.status !== "removed" && n.draft === 0);
  const runId = randomUUID();
  await db.prepare(
    `INSERT INTO automation_runs (id, automation, instance_id, current_node, status, started_at)
     VALUES (?, ?, ?, ?, 'running', datetime('now'))`,
  ).run(runId, proj.automation, check.instanceId, nodes[0]?.slug ?? null);

  const report: RunOutcome["nodes"] = [];
  let failed: string | undefined;

  for (const n of nodes) {
    const started = Date.now();
    await db.prepare(`UPDATE automation_runs SET current_node = ? WHERE id = ?`).run(n.slug, runId);
    const rowId = randomUUID();
    await db.prepare(
      `INSERT INTO automation_run_nodes (id, run_id, node_id, status) VALUES (?, ?, ?, 'running')`,
    ).run(rowId, runId, n.slug);

    try {
      const load = EXECUTABLES[`${proj.automation}:${n.slug}`];
      if (!load) throw new Error(`node "${n.slug}" is not in the executables registry`);
      const mod = await load();
      const order = await nodeFunctionsInOrder(proj.projectDir, n.slug);
      const paramsIn = await nodeParamsIn(proj.projectDir, n.slug);
      const outKeys = await nodeOutKeys(proj.projectDir, n.slug);

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
