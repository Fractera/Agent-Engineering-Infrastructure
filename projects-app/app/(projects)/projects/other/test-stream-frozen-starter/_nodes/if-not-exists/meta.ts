import type { NodeMeta } from "../../_types/node-contract";

// CONDITION node — the FAILURE branch off lookup-price: taken when the company has no public stock. A dead
// end for now (other conditions could leave it later). The condition KIND of an intermediate node (role
// "intermediate", ioType "condition") — drawn as a SQUARE on the diagram; short label.
export const META: NodeMeta = {
  id: "if-not-exists",
  cuid: "cmrtd2jv14obd74b673c763b519c39",
  name: "If not exists",
  role: "intermediate",
  ioType: "condition",
  parentId: "lookup-price",
  description: "The branch taken when no public stock exists for the request — the automation ends here.",
  in: {},
  out: {},
  conditions: ["no live price for the ticker"],
  run: "sequential",
  estDurationMs: 5,
};
