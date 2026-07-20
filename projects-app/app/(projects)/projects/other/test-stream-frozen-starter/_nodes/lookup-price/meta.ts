import type { NodeMeta } from "../../_types/node-contract";

// STARTING PATTERN node (step 243) — real, not draft. The first plain external HTTP call in this
// automation's diagram (no AI) — adapt the endpoint/logic for the owner's real task.
export const META: NodeMeta = {
  id: "lookup-price",
  cuid: "cmrtd2jv14obd4320673759786029e",
  name: "Look up the price",
  role: "intermediate",
  parentId: "parse-request",
  description: "Calls the free Yahoo Finance quote endpoint for the resolved ticker.",
  in: { ticker: "string" },
  out: { price: "number", asOf: "ISODate" },
  conditions: ["ticker was resolved by the previous node", "the quote service returns a live price"],
  run: "sequential",
  estDurationMs: 800,
};
