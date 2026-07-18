"use client";

import type { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { EntityPresence } from "./manifest";

// THE ENTITY SECTION FRAME (step 254.1, ROUTE-V3 law 2) — the ONE accordion frame every page entity
// renders through. The entity supplies only its CONTENT; the frame owns presentation, so fixing the
// accordion is one edit, never ten. Presence semantics:
//   "hidden"    → renders nothing;
//   "collapsed" → the folded accordion (title visible, content on demand);
//   "expanded"  → the accordion open by default (still foldable by hand).
// Standalone by design: each section is its own Accordion root, so sections compose in any order and a
// registry can render them from manifests without a shared parent state.
export function EntitySection({
  id,
  title,
  tooltip,
  presence,
  children,
}: {
  id: string;
  title: string;
  tooltip?: string;
  presence: EntityPresence;
  children: ReactNode;
}) {
  if (presence === "hidden") return null;
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={presence === "expanded" ? id : undefined}
      className="rounded-lg border px-4"
      data-entity-section={id}
    >
      <AccordionItem value={id}>
        <AccordionTrigger className="text-left" title={tooltip}>
          {title}
        </AccordionTrigger>
        <AccordionContent className="space-y-4">{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
