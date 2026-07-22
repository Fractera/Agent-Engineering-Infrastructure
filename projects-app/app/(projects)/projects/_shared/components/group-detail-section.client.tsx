"use client";

import { AlertTriangle } from "lucide-react";
import { ChainBriefPanel } from "./chain-brief-panel.client";
import { GroupDetailCanvas } from "./group-detail-canvas.client";
import { useUiLang } from "../use-ui-lang";
import { globalCanvasStrings } from "../global-canvas-i18n";

// GROUP AUTOMATION SECTION (step 238) — a Chained group automation's own dedicated page mounts THIS instead
// of DiagramSection (a group is a canvas-only container, not a workflow — a generic Input/Logic/Output draft
// diagram is meaningless for it). Same full-width layout convention as diagram-section.client.tsx
// (mx-auto mt-16 w-[var(--zone-w)] max-w-full), so the two are visually interchangeable in the page's sequence of
// sections. Renders the SAME ChainBriefPanel + GroupDetailCanvas the root canvas's side panel and eye icon
// already use (step 236/237/238) — no second implementation of either.
//
// THE ALWAYS-ON MODEL WARNING (owner 2026-07-16): a permanent ⚠ callout right below the group's description
// (the chain-brief panel) — never dismissible, never conditional. Working on a chained group requires the
// MOST powerful AI model available to the coding agent (a group is the scale mechanism: seams, contracts,
// decomposition — the hardest design work in the product); and once development completes, the automation
// runs entirely WITHOUT AI (the two-phase doctrine). 10 languages via globalCanvasStrings.
export function GroupDetailSection({ automation }: { automation: string }) {
  const L = globalCanvasStrings(useUiLang());
  return (
    <section className="mx-auto mt-16 w-[var(--zone-w)] max-w-full space-y-4 scroll-mt-4 rounded-lg border bg-muted/5 px-4 py-4">
      <h3 className="text-sm font-semibold">{L.groupPageHeading}</h3>
      <ChainBriefPanel automation={automation} />
      <div className="flex items-start gap-2 rounded-md border border-amber-500/60 bg-amber-500/10 px-3 py-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">{L.groupModelWarning}</p>
      </div>
      <GroupDetailCanvas automation={automation} />
    </section>
  );
}
