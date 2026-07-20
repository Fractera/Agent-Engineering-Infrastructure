import type { NodeFunction } from "../../_types/node-contract";
import { addRow, ingestToMemory } from "../../_lib/rows";

// STARTING PATTERN (step 243; imports through the route's OWN _lib/rows bridge since 254.9 — a node never
// reaches outside its route). Writes into the same rows store the owner's "Add row" writes to, never a
// bespoke table. ADAPT the fields for the owner's real task — keep this node LAST.
//
// TWO-STORE OUTPUT (step 260, owner's rule): the output node writes the result to BOTH stores — the
// automation's own dashboard table (structured rows) AND vector memory (searchable, tagged with this
// automation's address projects/other/test-stream-frozen-starter as provenance, never "unknown_source"). When you
// adapt this node for the real task, keep BOTH writes: a plain-language summary of the answer goes to memory.
// The provenance ROUTE (steps 261+263.1) is stamped AUTOMATICALLY: the run's real input channel and the
// authoring node come from the executor's run context, and a unique record tail is enforced by
// ingestToMemory itself (LightRAG treats the source as the doc's IDENTITY — one path, one doc). Pass
// facets.record = the row id so the memory links to its table row; never pass a channel here.
export async function recordLookup(company: string, ticker: string, price: number): Promise<{ rowId: string }> {
  const row = await addRow("other/test-stream-frozen-starter", "history", {
    date: new Date().toISOString(),
    company,
    ticker,
    price,
  });
  // Best-effort, never blocks the row write: remember the answer so it can be found later by meaning.
  await ingestToMemory({
    automation: "other/test-stream-frozen-starter",
    text: `${company} (${ticker}) price ${price} on ${new Date().toISOString()}`,
    facets: { record: row.id },
  });
  return { rowId: row.id };
}

export const FUNCTIONS: NodeFunction[] = [
  {
    name: "recordLookup",
    paramsIn: { company: "string", ticker: "string", price: "number" },
    returns: "{ rowId: string }",
    rules: ["deterministic; no AI inside the app", "reached only when every earlier node succeeded"],
  },
];
