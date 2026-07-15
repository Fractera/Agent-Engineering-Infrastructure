import type { NodeMeta } from "../../../../_shared/node-contract";

// Node "lookup-price" — co-located (step 243). The first node in this codebase that calls a plain external
// HTTP API (no AI, no shared helper existed to copy — see README notes at project root).
export const META: NodeMeta = {
  id: "lookup-price",
  cuid: "cxc2lookupprice0stream1",
  name: "Look up the price",
  description: "Calls the free Yahoo Finance quote endpoint for the resolved ticker.",
  in: { ticker: "string" },
  out: { price: "number", asOf: "ISODate" },
  conditions: ["ticker was resolved by the previous node", "the quote service returns a live price"],
  run: "sequential",
  estDurationMs: 800,
};
