"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EntitiesConfig } from "../entities";
import { ENTITY_ORDER, ENTITY_META } from "../entities";
import type { UseCase } from "../use-cases";
import { UseCasesPanel } from "./use-cases-panel.client";

// FROZEN STANDARD (step 222) — the series of entity accordions below the "Add or modify automation"
// button. Driven by the project's _data/config.ts (EntitiesConfig): `diagram` is always shown; the
// other five appear only when enabled; a disabled one is not rendered. At this stage each entity is an
// EMPTY container whose title has a hover tooltip (from ENTITY_META) explaining what it is — the data
// that will fill it (and generate real interfaces) comes in later steps. The mandatory Use cases
// accordion is always appended last, holding the numbered, status-badged cases.
export function AutomationAccordions({
  config,
  cases,
}: {
  config: EntitiesConfig;
  cases: UseCase[];
}) {
  const entities = ENTITY_ORDER.filter((k) => ENTITY_META[k].mandatory || config[k]);
  return (
    <TooltipProvider delayDuration={200}>
      <Accordion type="single" collapsible className="rounded-lg border px-4">
        {entities.map((k) => {
          const meta = ENTITY_META[k];
          return (
            <AccordionItem key={k} value={k}>
              <AccordionTrigger className="text-left">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="font-medium">{meta.label}</span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">{meta.tooltip}</TooltipContent>
                </Tooltip>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  This section appears here once configured. For now it is an empty container — see the
                  project README, &ldquo;The automation entities standard&rdquo;.
                </p>
              </AccordionContent>
            </AccordionItem>
          );
        })}

        {/* Use cases — mandatory, always last (outside the 6 config entities). */}
        <AccordionItem value="use-cases">
          <AccordionTrigger className="text-left">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-medium">User cases</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                The cases agreed with the architect: what the automation should do, one case at a time.
                Each carries a number (01, 02, …) and a status that moves from new to in use.
              </TooltipContent>
            </Tooltip>
          </AccordionTrigger>
          <AccordionContent>
            <UseCasesPanel cases={cases} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </TooltipProvider>
  );
}
