"use client";

import { useEffect, useState } from "react";
import type { NodeContract } from "../node-contract";
import { DiagramCanvas } from "./diagram-canvas.client";

// FROZEN STANDARD (step 223.C — owner design). The Diagram is NOT an accordion: it is ALWAYS visible,
// spanning the FULL screen width at 80vh, as the automation's centerpiece. It is rendered as a
// full-width section (outside the page's centered max-w column), so the canvas is always on screen and
// never hidden behind a collapsed accordion.
//
// TIMELINE FOCUS (step 230): clicking a bar in the Processes/Gantt timeline scrolls up to THIS section (the
// diagram is the automation's centerpiece) and titles it with the clicked node — the word "Diagram", the
// node name, and its planned start/end. The timeline dispatches a window CustomEvent "processes:focus-node";
// this section (id="diagram-section", the scroll anchor) listens and shows the title.
type Focus = { name: string; startMs: number; endMs: number } | null;

function fmt(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

export function DiagramSection({ nodes, automation }: { nodes: NodeContract[]; automation?: string }) {
  const [focus, setFocus] = useState<Focus>(null);

  useEffect(() => {
    const onFocus = (e: Event) => {
      const d = (e as CustomEvent).detail as { automation?: string; name: string; startMs: number; endMs: number };
      // Only react to a focus for THIS automation's diagram.
      if (automation && d.automation && d.automation !== automation) return;
      setFocus({ name: d.name, startMs: d.startMs, endMs: d.endMs });
    };
    window.addEventListener("processes:focus-node", onFocus);
    return () => window.removeEventListener("processes:focus-node", onFocus);
  }, [automation]);

  return (
    <section id="diagram-section" className="w-full scroll-mt-4 border-y bg-muted/5 px-4 py-4">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h3 className="text-sm font-semibold">Diagram</h3>
        {focus && (
          <span className="text-xs text-muted-foreground">
            — <span className="font-medium text-foreground">{focus.name}</span> · starts {fmt(focus.startMs)} · ends {fmt(focus.endMs)}
          </span>
        )}
      </div>
      <DiagramCanvas nodes={nodes} automation={automation} />
    </section>
  );
}
