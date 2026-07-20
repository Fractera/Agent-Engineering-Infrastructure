import type { NodeFunction } from "../../_types/node-contract";

// Visual condition node — a pass-through gate. Forwards the price unchanged; the real decision is made
// upstream by lookup-price throwing when there is no price. When condition nodes are standardized, this
// becomes the real conditional-routing check.
export async function whenPriceFound(price: number): Promise<{ price: number }> {
  return { price };
}

export const FUNCTIONS: NodeFunction[] = [
  {
    name: "whenPriceFound",
    paramsIn: { price: "number" },
    returns: "{ price: number }",
    rules: ["visual condition (pass-through) — carries a successful lookup forward to the output node"],
  },
];
