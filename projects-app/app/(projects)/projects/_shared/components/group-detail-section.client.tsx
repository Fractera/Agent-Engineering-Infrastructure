"use client";

import { ChainBriefPanel } from "./chain-brief-panel.client";
import { GroupDetailCanvas } from "./group-detail-canvas.client";
import { useUiLang } from "../use-ui-lang";
import { globalCanvasStrings } from "../global-canvas-i18n";

// GROUP AUTOMATION SECTION (step 238) — a Chained group automation's own dedicated page mounts THIS instead
// of DiagramSection (a group is a canvas-only container, not a workflow — a generic Input/Logic/Output draft
// diagram is meaningless for it). Same full-width layout convention as diagram-section.client.tsx
// (mx-auto mt-16 w-[85vw] max-w-full), so the two are visually interchangeable in the page's sequence of
// sections. Renders the SAME ChainBriefPanel + GroupDetailCanvas the root canvas's side panel and eye icon
// already use (step 236/237/238) — no second implementation of either.
export function GroupDetailSection({ automation }: { automation: string }) {
  const L = globalCanvasStrings(useUiLang());
  return (
    <section className="mx-auto mt-16 w-[85vw] max-w-full space-y-4 scroll-mt-4 rounded-lg border bg-muted/5 px-4 py-4">
      <h3 className="text-sm font-semibold">{L.groupPageHeading}</h3>
      <ChainBriefPanel automation={automation} />
      <GroupDetailCanvas automation={automation} />
    </section>
  );
}
