"use client";

import { useEffect, useState } from "react";
import type { NodeContract } from "../node-contract";
import { DiagramCanvas } from "./diagram-canvas.client";
import { useEntitiesLive } from "../use-entities-live";

// FROZEN STANDARD (step 223.C — owner design; toggle reversed in 237). The Diagram is NOT an accordion:
// it spans the FULL screen width at 80vh, as the automation's centerpiece, when its switch is ON — outside
// the page's centered max-w column so the canvas is never hidden behind a collapsed accordion. Owner
// (step 237): on by default (useful while building/debugging), but an automation handed to a non-technical
// end user can hide it from the hamburger menu — it is a plain if/else on the live entities flag now, not
// a structurally mandatory section. No `seed` prop is threaded in from each project's _data/config.ts here
// (every automation, old and new, already behaves as diagram:true today) — default true until the live
// fetch resolves, then the DB override (if any) wins, same as every other entity.
//
// TIMELINE FOCUS (step 230): clicking a bar in the Processes/Gantt timeline scrolls up to THIS section (the
// diagram is the automation's centerpiece) and titles it with the clicked node — the word "Diagram", the
// node name, and its planned start/end. The timeline dispatches a window CustomEvent "processes:focus-node";
// this section (id="diagram-section", the scroll anchor) listens and shows the title.
type Focus = { name: string; startMs: number; endMs: number } | null;

function fmt(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

// Spacing (owner): mt-16 = 64px of breathing room between the "Add or modify automation" button above and
// the canvas — they used to touch.
export function DiagramSection({ nodes, automation }: { nodes: NodeContract[]; automation?: string }) {
  const [focus, setFocus] = useState<Focus>(null);
  const { entities } = useEntitiesLive(automation, { diagram: true });

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

  if (entities.diagram === false) return null;

  return (
    <section id="diagram-section" className="mx-auto mt-16 w-[85vw] max-w-full scroll-mt-4 rounded-lg border bg-muted/5 px-4 py-4">
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
