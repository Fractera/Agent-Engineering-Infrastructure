"use client";

import { useEffect, useState } from "react";
import type { NodeContract } from "../../node-contract";
import { DiagramCanvas } from "../../components/diagram-canvas.client";
import { useEntitiesLive } from "../../use-entities-live";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3 — breaking this breaks the whole chain, FORBIDDEN):
// the CONTAINER is the ONLY place view and admin compose; never import another entity.
//
// THE DIAGRAM ENTITY CONTAINER (step 254.8, owner's ruling): the diagram IS shown to a visitor — as a
// READ-ONLY canvas (the same living nodes/edges/zoom/pan and run statuses, no Builder, no edge mode, no
// test/simulate buttons). mode="admin" keeps the full build surface. Full-width centerpiece in both.
export type DiagramMode = "view" | "admin";
type Focus = { name: string; startMs: number; endMs: number } | null;

function fmt(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

export function DiagramEntity({ nodes, automation, mode }: { nodes: NodeContract[]; automation?: string; mode: DiagramMode }) {
  const [focus, setFocus] = useState<Focus>(null);
  const { entities } = useEntitiesLive(automation, { diagram: true });

  // Timeline focus (step 230) — works in both planes: the processes timeline (view or admin) clicks
  // through to the diagram, the automation's centerpiece.
  useEffect(() => {
    const onFocus = (e: Event) => {
      const d = (e as CustomEvent).detail as { automation?: string; name: string; startMs: number; endMs: number };
      if (automation && d.automation && d.automation !== automation) return;
      setFocus({ name: d.name, startMs: d.startMs, endMs: d.endMs });
    };
    window.addEventListener("processes:focus-node", onFocus);
    return () => window.removeEventListener("processes:focus-node", onFocus);
  }, [automation]);

  if (entities.diagram === false) return null;

  return (
    <section
      id="diagram-section"
      className="mx-auto mt-16 w-[85vw] max-w-full scroll-mt-4 rounded-lg border bg-muted/5 px-4 py-4"
      data-entity-mode={mode}
      data-entity-section="diagram"
    >
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h3 className="text-sm font-semibold">Diagram</h3>
        {focus && (
          <span className="text-xs text-muted-foreground">
            — <span className="font-medium text-foreground">{focus.name}</span> · starts {fmt(focus.startMs)} · ends {fmt(focus.endMs)}
          </span>
        )}
      </div>
      <DiagramCanvas nodes={nodes} automation={automation} readOnly={mode === "view"} />
    </section>
  );
}
