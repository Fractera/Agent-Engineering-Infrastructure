import type { NodeMeta } from "../../../../_shared/node-contract";

// Node "record-result" — co-located (step 243). The automation's OUTPUT node: reached ONLY when both
// previous nodes succeeded (the executor stops the run at the first throw) — which is exactly what makes
// "a failed ask never writes a history row" true, with no special-casing in the executor itself.
export const META: NodeMeta = {
  id: "record-result",
  cuid: "cxc3recordresult0stream1",
  name: "Record the result",
  description: "Writes the successful lookup into this automation's History dashboard table.",
  in: { company: "string", ticker: "string", price: "number" },
  out: { rowId: "string" },
  conditions: ["reached only after a successful price lookup"],
  run: "sequential",
  estDurationMs: 20,
};
