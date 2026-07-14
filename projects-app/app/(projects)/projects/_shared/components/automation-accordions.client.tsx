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
import { ENTITY_ORDER } from "../entities";
import type { UseCase } from "../use-cases";
import type { DashboardConfig } from "../table-config";
import { UseCasesPanel } from "./use-cases-panel.client";
import { DashboardAccordion } from "./dashboard-accordion.client";
import { ProcessesTimeline } from "./processes-timeline.client";
import { useUiLang } from "../use-ui-lang";
import { useCasesStrings } from "../use-cases-i18n";
import { useEntitiesLive } from "../use-entities-live";
import { automationMenuStrings } from "../automation-menu-i18n";

// FROZEN STANDARD (step 222; toggles reversed in 237) — the series of entity accordions below the "Add or
// modify automation" button. Driven by the project's _data/config.ts SEED (EntitiesConfig), merged with
// the owner's live override from the hamburger menu switches (`use-entities-live.ts` — instant, no
// rebuild). Nothing is structurally mandatory any more: `diagram` renders separately (see
// DiagramSection), everything else here is a plain filter on the merged flag. At this stage each entity is
// an EMPTY container whose title has a hover tooltip explaining what it is — the data that will fill it
// (and generate real interfaces) comes in later steps. `usecases` is ONE of these entities (its accordion
// visibility follows the switch like any other) but its review GATE (step 231) stays mandatory regardless
// of the switch — hiding the accordion never bypasses the gate before a Development Step.
export function AutomationAccordions({
  config,
  cases,
  automation,
  dashboard,
}: {
  // Partial by design (step 222, scaling): a project's _data/config.ts may not list a key that was
  // added to the registry later — a missing key reads as "off", so adding a new entity never breaks
  // an existing project. This is the SEED; the live override (step 237) is merged on top internally.
  config: Partial<EntitiesConfig>;
  cases: UseCase[];
  /** "category/slug" — scopes the dashboard tables' per-table column-visibility (step 228). */
  automation?: string;
  /** The dashboard's tables (step 228). When present, the Dashboard accordion renders them. */
  dashboard?: DashboardConfig;
}) {
  const lang = useUiLang();
  const L = useCasesStrings(lang);
  const M = automationMenuStrings(lang);
  const { entities: live } = useEntitiesLive(automation, config);
  // The Diagram is NOT in this accordion series (owner design, step 223.C): it is rendered separately as
  // a full-width section (DiagramSection), gated by its OWN live flag. Here we render the other entities,
  // each a plain filter on the live-merged flag — nothing is structurally mandatory any more (step 237).
  const shown = ENTITY_ORDER.filter((k) => k !== "diagram" && Boolean(live[k]));
  return (
    <TooltipProvider delayDuration={200}>
      <Accordion type="single" collapsible className="rounded-lg border px-4">
        {shown.map((k) => {
          const title = k === "usecases" ? L.sectionTitle : M.entities[k].label;
          const tooltip = k === "usecases" ? L.sectionTooltip : M.entities[k].tooltip;
          return (
            <AccordionItem key={k} value={k}>
              <AccordionTrigger className="text-left">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="font-medium">{title}</span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
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
                ) : k === "usecases" ? (
                  // The automation scopes the LIVE case store, the pencils and the review gate (step 231) —
                  // the gate stays mandatory no matter this switch; only the accordion's visibility follows it.
                  <UseCasesPanel cases={cases} automation={automation} />
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
      </Accordion>
    </TooltipProvider>
  );
}
