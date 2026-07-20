import type { NodeMeta } from "../../_types/node-contract";

// STARTING PATTERN node (step 243) — real, not draft. Adapt freely for the owner's real task.
export const META: NodeMeta = {
  id: "parse-request",
  cuid: "cmrtd2jv14obd32e4deab40fa5c000",
  name: "Parse the request",
  role: "input",
  ioType: "control-panel",
  description: "Recognizes a known company in the owner's free-text ask and resolves it to a ticker.",
  in: { query: "string" },
  out: { company: "string", ticker: "string" },
  conditions: ["query mentions a company from the small known-company dictionary"],
  run: "sequential",
  estDurationMs: 20,
};
