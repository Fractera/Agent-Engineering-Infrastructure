"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProcessFlow } from "./process-flow.client";

// Process diagram wrapped in a COLLAPSED accordion at the top of the project page (step 205 §G).
// The diagram is reference detail, not the primary surface — it starts closed so the page opens on
// the working controls (run / settings / records), and the user expands the flow only when they want it.
export function DiagramAccordion({ label }: { label: string }) {
  return (
    <Accordion type="single" collapsible className="rounded-lg border px-4">
      <AccordionItem value="diagram">
        <AccordionTrigger className="text-left">
          <span className="font-medium">{label}</span>
        </AccordionTrigger>
        <AccordionContent>
          <ProcessFlow />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
