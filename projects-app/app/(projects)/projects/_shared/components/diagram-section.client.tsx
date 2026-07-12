"use client";

import type { NodeContract } from "../node-contract";
import { DiagramCanvas } from "./diagram-canvas.client";

// FROZEN STANDARD (step 223.C — owner design). The Diagram is NOT an accordion: it is ALWAYS visible,
// spanning the FULL screen width at 80vh, as the automation's centerpiece. It is rendered as a
// full-width section (outside the page's centered max-w column), so the canvas is always on screen and
// never hidden behind a collapsed accordion.
export function DiagramSection({ nodes, automation }: { nodes: NodeContract[]; automation?: string }) {
  return (
    <section className="w-full border-y bg-muted/5 px-4 py-4">
      <DiagramCanvas nodes={nodes} automation={automation} />
    </section>
  );
}
