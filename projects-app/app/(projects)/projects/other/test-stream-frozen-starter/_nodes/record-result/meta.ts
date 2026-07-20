import type { NodeMeta } from "../../_types/node-contract";

// STARTING PATTERN node (step 243) — real, not draft. The automation's OUTPUT node: reached ONLY when
// both previous nodes succeeded (the executor stops the run at the first throw) — which is exactly what
// makes "a failed ask never writes a row" true, with no special-casing in the executor itself.
export const META: NodeMeta = {
  id: "record-result",
  cuid: "cmrtd2jv14obd5200827ea710fbca8",
  name: "Record the result",
  role: "output",
  ioType: "dashboard",
  description: "Writes the successful lookup into this automation's History dashboard table.",
  in: { company: "string", ticker: "string", price: "number" },
  out: { rowId: "string" },
  conditions: ["reached only after a successful lookup"],
  run: "sequential",
  estDurationMs: 20,
};
