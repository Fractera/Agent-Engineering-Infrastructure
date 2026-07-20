import type { NodeFunction } from "../../_types/node-contract";

// Visual condition node — a no-op dead end. It does nothing: on a real failure lookup-price has already
// thrown and stopped the run before this point, so no row is ever written down this branch.
export async function whenNotFound(): Promise<Record<string, never>> {
  return {};
}

export const FUNCTIONS: NodeFunction[] = [
  {
    name: "whenNotFound",
    paramsIn: {},
    returns: "{}",
    rules: ["visual condition (no-op) — the dead-end branch when no stock exists"],
  },
];
