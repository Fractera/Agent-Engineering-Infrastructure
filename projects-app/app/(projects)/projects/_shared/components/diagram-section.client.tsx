"use client";

import type { NodeContract } from "../node-contract";
import { DiagramEntity } from "../entities/diagram";

// COMPAT WRAPPER (step 254.8) — the diagram moved to the view/admin/container pattern at
// _shared/entities/diagram/ (ROUTE-V3 law 3): view = the read-only canvas, admin = the full build
// surface. This name stays for the skeleton imports; it IS the admin composition.
export function DiagramSection({ nodes, automation }: { nodes: NodeContract[]; automation?: string }) {
  return <DiagramEntity nodes={nodes} automation={automation} mode="admin" />;
}
