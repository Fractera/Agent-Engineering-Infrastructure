"use client";

import { useEffect, useState } from "react";
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
import type { EntitiesConfig, OrderableKey } from "../entities";
import type { UseCase } from "../use-cases";
import type { DashboardConfig } from "../table-config";
import { UseCasesEntity } from "../entities/usecases";
import { DashboardAccordion } from "./dashboard-accordion.client";
import { CalendarEntity } from "../entities/calendar";
import { CronEntity } from "../entities/cron";
import { MapEntity } from "../entities/map";
import { AnalyticsEntity } from "../entities/analytics";
import { ProcessesEntity } from "../entities/processes";
import { RequirementBriefPanel } from "./requirement-brief-panel.client";
import { AppPagesEntity } from "../entities/apppages";
import { useUiLang } from "../use-ui-lang";
import { useCasesStrings } from "../use-cases-i18n";
import { useEntitiesLive } from "../use-entities-live";
import { useEntityOrderLive } from "../use-entity-order-live";
import { automationMenuStrings } from "../automation-menu-i18n";
import { requirementScope } from "../requirement-scope-i18n";
import type { EntityType } from "@/lib/entity-store";

// FROZEN STANDARD (step 222; toggles reversed in 237) — the series of entity accordions below the "Add or
// modify automation" button. Driven by the project's _data/config.ts SEED (EntitiesConfig), merged with
// the owner's live override from the hamburger menu switches (`use-entities-live.ts` — instant, no
// rebuild). Nothing is structurally mandatory any more: `diagram` renders separately (see
// DiagramSection), everything else here is a plain filter on the merged flag. At this stage each entity is
// an EMPTY container whose title has a hover tooltip explaining what it is — the data that will fill it
// (and generate real interfaces) comes in later steps. `usecases` is ONE of these entities (its accordion
// visibility follows the switch like any other) but its review GATE (step 231) stays mandatory regardless
// of the switch — hiding the accordion never bypasses the gate before a Development Step.
// THE FROZEN-TEMPLATE NOTICE (step 243.2) — a small, dismissible-by-nature (it disappears once the section
// carries real content) framing above every entity's real content: this is a DEMO the owner can freely
// explore, not a promise of what a real, developed automation's section will show. Text is 10-language
// (see `frozenTemplateNotice` in automation-menu-i18n.ts) — no "developed" flag exists yet (a later step),
// so for now it always renders on the frozen starter's default state.
// LIFECYCLE-AWARE since step 255.B5 (the owner's rule): the notice shows only while the automation is
// still the frozen demo — the FIRST really-landed object (materialize / entity-summary flips the
// lifecycle flag, step 249) makes every notice vanish, live (the same window-event pattern the entity
// toggles use; a `automation:lifecycle-changed` dispatch after a landing refreshes without reload).
export function FrozenTemplateNotice({ text, automation }: { text: string; automation?: string }) {
  const [real, setReal] = useState(false);
  useEffect(() => {
    if (!automation) return;
    let alive = true;
    const check = () => {
      fetch(`/api/projects/lifecycle?automation=${encodeURIComponent(automation)}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { state?: string } | null) => { if (alive && d?.state === "real-automation") setReal(true); })
        .catch(() => { /* keep showing */ });
    };
    check();
    const onChanged = (e: Event) => {
      if ((e as CustomEvent).detail?.automation === automation) check();
    };
    window.addEventListener("automation:lifecycle-changed", onChanged);
    return () => { alive = false; window.removeEventListener("automation:lifecycle-changed", onChanged); };
  }, [automation]);
  if (real) return null;
  return (
    <p className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground" data-frozen-notice="1">
      {text}
    </p>
  );
}

export function AutomationAccordions({
  config,
  cases,
  automation,
  dashboard,
  type,
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
  /** The automation's immutable type (step 239). Passed by the skeleton; when absent (a project generated
   *  before this step, whose _components/index.tsx does not pass it yet) it is fetched below, so the
   *  fork-activation surface appears for EXISTING instanced automations too, with no page regeneration. */
  type?: "stream" | "instanced" | "chained";
}) {
  const lang = useUiLang();
  const L = useCasesStrings(lang);
  const M = automationMenuStrings(lang);
  const { entities: live } = useEntitiesLive(automation, config);
  // The owner's dragged section order (step 241) — the accordions render in exactly this order, live. Same
  // list the hamburger menu drags; a reorder there reaches here instantly through the shared window event.
  const { order } = useEntityOrderLive(automation);

  // FORK ACTIVATION (step 239) — the tenth entity, shown ONLY for an `instanced` automation (it answers "how
  // does one run of this thing start", which is meaningless for stream/chained). It has no visibility switch:
  // an instanced automation always has it. `/api/projects/global` already carries every project's type (it is
  // the canvas's own source of truth) — reuse it rather than adding a second type endpoint.
  const [fetchedType, setFetchedType] = useState<string | null>(null);
  useEffect(() => {
    if (type || !automation) return;
    let alive = true;
    fetch(`/api/projects/global`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { projects?: { automation: string; type?: string }[] } | null) => {
        if (!alive) return;
        setFetchedType(d?.projects?.find((p) => p.automation === automation)?.type ?? null);
      })
      .catch(() => { /* type stays unknown → the surface simply does not render */ });
    return () => { alive = false; };
  }, [type, automation]);
  const isInstanced = (type ?? fetchedType) === "instanced";
  // The section series, in the owner's live-dragged order (step 241). The Diagram is rendered SEPARATELY as a
  // full-width section (DiagramSection, step 223.C), so it is dropped here whatever its rank. Fork activation
  // is an accordion ONLY for an instanced automation; every other entity follows its own on/off flag.
  const shown = order.filter((k) => {
    if (k === "diagram") return false;
    // `controlpanel` (the launch console) is rendered SEPARATELY, full-width above the diagram, by
    // ActivationLayer — exactly like `diagram`. It carries a visibility switch in the menu, but it is not
    // one of the in-series accordions here, so drop it whatever its rank (its own accordion lives in
    // ActivationLayer, gated on the same live toggle).
    if (k === "controlpanel") return false;
    if (k === "fork-activation") return isInstanced && Boolean(automation);
    return Boolean(live[k]);
  });

  const renderItem = (k: OrderableKey) => {
    if (k === "fork-activation") {
      // FORK ACTIVATION (step 239) — an instanced automation's starting mechanism: which settings one run
      // takes, how the fork is created with them, and when it launches. Same design surface as every other
      // requirement (voice + "Add with AI" + Save).
      return (
        <AccordionItem key={k} value={k}>
          <AccordionTrigger className="text-left">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-medium">{M.forkActivationLabel}</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{M.forkActivationTooltip}</TooltipContent>
            </Tooltip>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <FrozenTemplateNotice text={M.frozenTemplateNotice} automation={automation} />
            <RequirementBriefPanel entityType="fork-activation" entityLabel={M.forkActivationLabel} scopeLabel={requirementScope(lang, "fork-activation")} automation={automation} />
          </AccordionContent>
        </AccordionItem>
      );
    }
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
        <AccordionContent className="space-y-4">
          <FrozenTemplateNotice text={M.frozenTemplateNotice} automation={automation} />
          {k === "dashboard" ? (
            <>
              {/* The Dashboard is the first entity with a real interface (step 228): ONE tab, any number of
                  config-driven tables. */}
              <DashboardAccordion automation={automation ?? ""} dashboard={dashboard} />
              {/* The requirement brief (step 238 P5-P9) still applies on top of the real interface. */}
              <RequirementBriefPanel entityType="dashboard" entityLabel={title} scopeLabel={requirementScope(lang, "dashboard")} automation={automation} />
            </>
          ) : k === "processes" ? (
            // The Processes entity container (step 254.6): admin mode = the Gantt timeline with Run/Reset
            // in its toolbar + the requirement panel — all composed INSIDE the container now.
            <ProcessesEntity automation={automation ?? ""} mode="admin" />
          ) : k === "usecases" ? (
            // The use-cases entity container (step 254.8): admin = the full owner panel (pencils, Quiz,
            // review gate — mandatory regardless of the visibility switch, step 231).
            <UseCasesEntity cases={cases} automation={automation} mode="admin" />
          ) : k === "apppages" ? (
            // The application-pages entity container (step 254.8d): admin = the declaration panel (step 242)
            // + the page-format PREVIEW (hero → AI console → table → cases as Q&A) right below it.
            <AppPagesEntity automation={automation ?? ""} dashboard={dashboard} cases={cases} mode="admin" />
          ) : k === "calendar" ? (
            // The Calendar entity container (step 254.4): admin mode = instruction banner + the read-only
            // month-grid/planner view + the requirement panel — all composed INSIDE the container now.
            <CalendarEntity automation={automation ?? ""} mode="admin" />
          ) : k === "cron" ? (
            // The Cron entity container (step 254.5): admin mode = description + the schedule controls
            // (cron.json writes) + the requirement panel — all composed INSIDE the container now.
            <CronEntity automation={automation ?? ""} mode="admin" />
          ) : k === "map" ? (
            // Requirement-only entity containers (step 254.7) — admin mode = the requirement panel.
            <MapEntity automation={automation ?? ""} mode="admin" />
          ) : k === "analytics" ? (
            <AnalyticsEntity automation={automation ?? ""} mode="admin" />
          ) : (
            // Any future entity not yet migrated to a container — the requirement brief fallback.
            <RequirementBriefPanel entityType={k as EntityType} entityLabel={title} scopeLabel={requirementScope(lang, k as "map" | "analytics")} automation={automation} />
          )}
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Accordion type="single" collapsible className="rounded-lg border px-4">
        {shown.map(renderItem)}
      </Accordion>
    </TooltipProvider>
  );
}
