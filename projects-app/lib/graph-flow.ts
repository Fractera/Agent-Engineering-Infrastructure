import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

// THE DATA-FLOW GATE (263.1, owner's doctrine after automation-48qwh) — the machine check of what the
// WIRING-RULES prose demands: every node must be FED (its inputs producible by someone upstream) and
// every node must be CONSUMED (its outputs read by someone downstream). Born from a live failure: a
// weak model bolted a two-node "food" island onto the stock demo — no node produced its inputs
// (photoData), no node consumed its outputs (calories) — and structural validation happily passed it.
// Prose teaches strong models; gates align weak ones.
//
// The analysis mirrors the EXECUTOR's real semantics (lib/executor.ts): nodes share one context bag,
// a function's args are looked up BY NAME from paramsIn, and its return lands under the function name,
// the node's out keys, and (spread) its object keys. So "fed" and "consumed" are computable from the
// node files alone. Two DELIBERATELY conservative rules (zero false positives on the frozen template):
//   - STARVATION: a non-input node whose first function (the trigger contract) demands keys that NO
//     other node can produce — every single key unfed. Partially fed nodes pass (keys may ride in with
//     the run input).
//   - DEAD NODE: a non-output node with declared out keys that NO other node ever reads. A produced
//     value nobody consumes is the definition of a dead node (WIRING-RULES §4.1).
// Draft nodes are skipped: they are unbuilt by definition.

type FlowNode = {
  slug: string;
  role: string | undefined;
  draft: boolean;
  outKeys: string[];
  fnNames: string[];
  firstParams: string[];
  allParams: string[];
};

const keysOf = (block: string | undefined): string[] =>
  block ? [...block.matchAll(/(\w+)\s*:/g)].map((m) => m[1]) : [];

async function readFlowNode(nodesDir: string, slug: string): Promise<FlowNode | null> {
  const meta = await readFile(join(nodesDir, slug, "meta.ts"), "utf8").catch(() => null);
  if (meta === null) return null;
  const functions = await readFile(join(nodesDir, slug, "functions.ts"), "utf8").catch(() => "");
  const fns = [...functions.matchAll(/name:\s*"(\w+)"\s*,\s*paramsIn:\s*\{([^}]*)\}/g)];
  return {
    slug,
    role: meta.match(/role:\s*["']([^"']+)["']/)?.[1],
    draft: /["']?draft["']?\s*:\s*true/.test(meta),
    outKeys: keysOf(meta.match(/out:\s*\{([^}]*)\}/)?.[1]),
    fnNames: fns.map((m) => m[1]),
    firstParams: keysOf(fns[0]?.[2]),
    allParams: fns.flatMap((m) => keysOf(m[2])),
  };
}

/** Analyze an automation's _nodes/ directory; returns teaching violations (empty = flow is sound). */
export async function analyzeGraphFlow(nodesDir: string): Promise<string[]> {
  let slugs: string[] = [];
  try {
    slugs = (await readdir(nodesDir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return []; // no _nodes at all — nothing to analyze
  }
  const nodes = (await Promise.all(slugs.map((s) => readFlowNode(nodesDir, s))))
    .filter((n): n is FlowNode => n !== null && !n.draft);
  if (nodes.length < 2) return [];

  const violations: string[] = [];
  for (const n of nodes) {
    const others = nodes.filter((o) => o.slug !== n.slug);
    const producible = new Set(others.flatMap((o) => [...o.outKeys, ...o.fnNames]));
    const consumedElsewhere = new Set(others.flatMap((o) => o.allParams));

    if (n.role !== "input" && n.firstParams.length && n.firstParams.every((k) => !producible.has(k))) {
      violations.push(
        `_nodes/${n.slug}: STARVED — its first function demands {${n.firstParams.join(", ")}} and NO other node ` +
        `produces any of these keys. Data cannot reach it: either wire it after a node whose out keys feed it, ` +
        `or (if it receives from the outside world) it must be an INPUT node on its own channel (WIRING-RULES §1/§5). ` +
        `An unfed island that compiles is still a dead automation.`,
      );
    }
    if (n.role !== "output" && n.outKeys.length && !n.outKeys.some((k) => consumedElsewhere.has(k))) {
      violations.push(
        `_nodes/${n.slug}: DEAD END — it produces {${n.outKeys.join(", ")}} and NO other node consumes any of ` +
        `them. A produced value nobody reads is the definition of a dead node (WIRING-RULES §4.1): either wire a ` +
        `consumer (a recorder, a reply node), or make this node an OUTPUT that persists/delivers the result itself.`,
      );
    }
  }
  return violations;
}
