// ДВИЖОК ИСПОЛНЕНИЯ v2 — СОБСТВЕННЫЙ, читает ТИПИЗИРОВАННОЕ ЯДРО напрямую (закон 0: внутри папки,
// снаружи только zod + node-builtins; НЕ импортирует платформенный lib/executor).
//
// Семантика зеркалит доказанный v1 (lib/executor.ts), но источник истины — automation.json, не meta.ts:
//   1. lifecycle обязан быть real-project — замороженный шаблон (всё hidden) не исполняется;
//   2. исполняются ТОЛЬКО видимые узлы; топологический порядок по видимым рёбрам (Kahn), при равенстве —
//      порядок рождения (индекс в графе);
//   3. один общий context-bag; функция узла = (ctx) => частичный ctx, слитый обратно в bag;
//   4. ПЕРВЫЙ throw останавливает цепочку — упавший прогон не пишет вывод (провал корректен);
//   5. возврат `null` из узла-условия = ветка не держит, штатная остановка (не ошибка).
//
// Контракт функции узла (общий для _lib/nodes/*.ts): NodeFn ниже.
import { readCore } from "./core-io";
import { allNodes, type Node } from "../_data/automation.schema";
import { NODE_FUNCTIONS } from "./nodes";
import { appendRun } from "./runs";

export type NodeCtx = Record<string, unknown>;
export type NodeResult = NodeCtx | null | void;
export type NodeFn = (ctx: NodeCtx) => NodeResult | Promise<NodeResult>;

export type RunNodeReport = { cuid: string; name: string; fn: string; status: "ok" | "stopped" | "fail"; error?: string };
export type RunOutcome = { ok: boolean; runId: string; startedAt: string; nodes: RunNodeReport[]; context: NodeCtx; error?: string };
export type RunRefusal = { refusal: string };

const cuid = () => `crun${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Kahn topological sort over the visible edges; ties broken by birth order (index in the node list). */
function topoOrder(nodes: Node[], edges: { from: string; to: string }[]): Node[] {
  const order = new Map(nodes.map((n, i) => [n.cuid, i]));
  const indeg = new Map(nodes.map((n) => [n.cuid, 0]));
  const outAdj = new Map<string, string[]>(nodes.map((n) => [n.cuid, []]));
  for (const e of edges) {
    if (!indeg.has(e.from) || !indeg.has(e.to)) continue;
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
    outAdj.get(e.from)!.push(e.to);
  }
  const byCuid = new Map(nodes.map((n) => [n.cuid, n]));
  const ready = nodes.filter((n) => (indeg.get(n.cuid) ?? 0) === 0).map((n) => n.cuid);
  const result: Node[] = [];
  const seen = new Set<string>();
  while (ready.length) {
    ready.sort((a, b) => (order.get(a)! - order.get(b)!)); // stable birth-order tiebreak
    const cur = ready.shift()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    result.push(byCuid.get(cur)!);
    for (const nxt of outAdj.get(cur) ?? []) {
      indeg.set(nxt, (indeg.get(nxt) ?? 0) - 1);
      if ((indeg.get(nxt) ?? 0) === 0) ready.push(nxt);
    }
  }
  // any node left out (a cycle) is appended in birth order so it still runs deterministically
  for (const n of nodes) if (!seen.has(n.cuid)) result.push(n);
  return result;
}

export async function executeAutomation(input: NodeCtx): Promise<RunOutcome | RunRefusal> {
  const core = await readCore();
  if (core.passport.lifecycle !== "real-project") {
    return { refusal: "a frozen template does not run — set lifecycle to real-project and reveal the nodes first" };
  }
  const nodes = allNodes(core.graph.nodes);
  const visible = nodes.filter((n) => n.state === "visible");
  if (!visible.length) return { refusal: "there is no visible node to run" };

  const visibleCuids = new Set(visible.map((n) => n.cuid));
  const edges = core.graph.edges.filter((e) => visibleCuids.has(e.from) && visibleCuids.has(e.to));
  const order = topoOrder(visible, edges);

  const runId = cuid();
  const startedAt = new Date().toISOString();
  let ctx: NodeCtx = { ...input };
  const reports: RunNodeReport[] = [];

  for (const node of order) {
    const fnName = node.function.name;
    const fn = NODE_FUNCTIONS[fnName] as NodeFn | undefined;
    if (!fn) {
      reports.push({ cuid: node.cuid, name: node.name, fn: fnName, status: "fail", error: `no function "${fnName}" is registered in _lib/nodes/index.ts` });
      break;
    }
    try {
      const out = await fn(ctx);
      if (out === null) {
        // a condition whose branch does not hold — a lawful stop, not a failure
        reports.push({ cuid: node.cuid, name: node.name, fn: fnName, status: "stopped" });
        break;
      }
      if (out && typeof out === "object") ctx = { ...ctx, ...out };
      reports.push({ cuid: node.cuid, name: node.name, fn: fnName, status: "ok" });
    } catch (e) {
      reports.push({ cuid: node.cuid, name: node.name, fn: fnName, status: "fail", error: e instanceof Error ? e.message : String(e) });
      break;
    }
  }

  const failed = reports.find((r) => r.status === "fail");
  const outcome: RunOutcome = { ok: !failed, runId, startedAt, nodes: reports, context: ctx, error: failed?.error };
  await appendRun({ runId, startedAt, finishedAt: new Date().toISOString(), ok: outcome.ok, nodes: reports });
  return outcome;
}
