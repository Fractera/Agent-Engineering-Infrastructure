"use client";

import type { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Parent collapsible section (step 207.19, owner layout rule): the WORKING surfaces (tables, calendar)
// sit high on the page; Use cases and Settings each collapse into ONE parent accordion — open the
// parent first, then work with the inner accordions. Server components pass children into this thin
// client shell (Radix accordions are client-side).
export function CollapsibleSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Accordion type="single" collapsible className="rounded-lg border px-4">
      <AccordionItem value="section" className="border-b-0">
        <AccordionTrigger className="text-xl font-medium">{title}</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-1">{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
