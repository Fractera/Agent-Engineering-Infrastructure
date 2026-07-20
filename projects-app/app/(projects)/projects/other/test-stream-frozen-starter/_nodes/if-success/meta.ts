import type { NodeMeta } from "../../_types/node-contract";

// CONDITION node — the SUCCESS branch off lookup-price: carries the flow into the output node. It is the
// condition KIND of an intermediate node (role "intermediate", ioType "condition"), which is what draws it as
// a SQUARE on the diagram; keep its label SHORT — it is read at a glance. Visual pass-through for now; the
// real success/failure gating is lookup-price throwing on no price.
export const META: NodeMeta = {
  id: "if-success",
  cuid: "cmrtd2jv14obd652bb4fa79b8c0bb4",
  name: "If success",
  role: "intermediate",
  ioType: "condition",
  description: "The branch taken when a live price was found — the flow continues to the output node.",
  in: { price: "number" },
  out: { price: "number" },
  conditions: ["a live price was returned"],
  run: "sequential",
  estDurationMs: 5,
};
