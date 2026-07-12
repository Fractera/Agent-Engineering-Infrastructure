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
import type { DashboardConfig } from "../table-config";
import { UseCasesPanel } from "./use-cases-panel.client";
import { DashboardAccordion } from "./dashboard-accordion.client";
import { ProcessesTimeline } from "./processes-timeline.client";

// FROZEN STANDARD (step 222) — the series of entity accordions below the "Add or modify automation"
// button. Driven by the project's _data/config.ts (EntitiesConfig): `diagram` is always shown; the
// other five appear only when enabled; a disabled one is not rendered. At this stage each entity is an
// EMPTY container whose title has a hover tooltip (from ENTITY_META) explaining what it is — the data
// that will fill it (and generate real interfaces) comes in later steps. The mandatory Use cases
// accordion is always appended last, holding the numbered, status-badged cases.
export function AutomationAccordions({
  config,
  cases,
  automation,
  dashboard,
}: {
  // Partial by design (step 222, scaling): a project's _data/config.ts may not list a key that was
  // added to the registry later — a missing key reads as "off", so adding a new entity never breaks
  // an existing project. Mandatory entities render regardless of the config.
  config: Partial<EntitiesConfig>;
  cases: UseCase[];
  /** "category/slug" — scopes the dashboard tables' per-table column-visibility (step 228). */
  automation?: string;
  /** The dashboard's tables (step 228). When present, the Dashboard accordion renders them. */
  dashboard?: DashboardConfig;
}) {
  // The Diagram is NOT in the accordion series (owner design, step 223.C): it is rendered separately as
  // a full-width, always-visible section (DiagramSection). Here we render the OTHER entities only.
  const entities = ENTITY_ORDER.filter(
    (k) => k !== "diagram" && (ENTITY_META[k].mandatory || Boolean(config[k])),
  );
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
                {k === "dashboard" ? (
                  // The Dashboard is the first entity with a real interface (step 228): ONE tab, any number
                  // of config-driven tables. The others are still empty containers until their own step.
                  <DashboardAccordion automation={automation ?? ""} dashboard={dashboard} />
                ) : k === "processes" ? (
                  // The Processes/Gantt timeline (step 230): a row per fork, laid out by estimated duration,
                  // shifting as runs finish. Shown only when the automation has forks.
                  <ProcessesTimeline automation={automation ?? ""} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This section appears here once configured. For now it is an empty container — see the
                    project README, &ldquo;The automation entities standard&rdquo;.
                  </p>
                )}
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
            {/* The automation scopes the LIVE case store, the pencils and the review gate (step 231). */}
            <UseCasesPanel cases={cases} automation={automation} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </TooltipProvider>
  );
}
