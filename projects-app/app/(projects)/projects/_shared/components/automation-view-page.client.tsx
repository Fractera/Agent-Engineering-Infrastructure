"use client";

import type { NodeContract } from "../node-contract";
import type { DashboardConfig } from "../table-config";
import type { UseCase } from "../use-cases";
import type { EntitiesConfig, EntityKey } from "../entities";
import { useUiLang } from "../use-ui-lang";
import { useCasesStrings } from "../use-cases-i18n";
import { automationMenuStrings } from "../automation-menu-i18n";
import { useEntitiesLive } from "../use-entities-live";
import { useEntityOrderLive } from "../use-entity-order-live";
import { EntitySection } from "../entity-section";
import { ControlPanelEntity, type ControlPanelInitial } from "../entities/controlpanel";
import { DiagramEntity } from "../entities/diagram";
import { DashboardEntity } from "../entities/dashboard";
import { CalendarEntity } from "../entities/calendar";
import { CronEntity } from "../entities/cron";
import { ProcessesEntity } from "../entities/processes";
import { MapEntity } from "../entities/map";
import { AnalyticsEntity } from "../entities/analytics";
import { UseCasesEntity } from "../entities/usecases";

// THE PUBLIC AUTOMATION PAGE (step 254.12, ROUTE-V3 law 5) — the VIEW composition of the whole page: what
// a VISITOR sees behind the parallel routing (/projects* proxied from the shell). Same hero, the same
// living sections — every entity in its view mode, zero admin chrome: no status bar, no wave banner, no
// quizzes, no requirement panels, no Builder. The owner's visibility switches (step 237) and dragged
// order (step 241) are honoured exactly like the cockpit does. BASE-LAYER composition — the one kind of
// file allowed to assemble entity containers (ROUTE-V3 law 3).
export function AutomationViewPage({
  automation,
  title,
  description,
  nodes,
  dashboard,
  cases,
  config,
  controlPanel,
}: {
  automation: string;
  title: string;
  description?: string;
  nodes: NodeContract[];
  dashboard?: DashboardConfig;
  cases: UseCase[];
  config: Partial<EntitiesConfig>;
  /** The SSR seed of the console (the 254.3 rule: first paint from the route's own declarations). */
  controlPanel?: ControlPanelInitial;
}) {
  const lang = useUiLang();
  const L = useCasesStrings(lang);
  const M = automationMenuStrings(lang);
  const { entities: live } = useEntitiesLive(automation, config);
  const { order } = useEntityOrderLive(automation);

  // The accordion series in the owner's live order — diagram and controlpanel render separately
  // (full-width), fork-activation and apppages are admin-only surfaces; everything else follows its flag.
  const shown = order.filter((k) => {
    if (k === "diagram" || k === "controlpanel" || k === "fork-activation" || k === "apppages") return false;
    return Boolean(live[k]);
  });

  const sectionTitle = (k: EntityKey) => (k === "usecases" ? L.sectionTitle : M.entities[k].label);
  const sectionTooltip = (k: EntityKey) => (k === "usecases" ? L.sectionTooltip : M.entities[k].tooltip);

  const body = (k: EntityKey) => {
    switch (k) {
      case "dashboard": return <DashboardEntity automation={automation} dashboard={dashboard} mode="view" />;
      case "calendar": return <CalendarEntity automation={automation} mode="view" />;
      case "cron": return <CronEntity automation={automation} mode="view" />;
      case "processes": return <ProcessesEntity automation={automation} mode="view" />;
      case "map": return <MapEntity automation={automation} mode="view" />;
      case "analytics": return <AnalyticsEntity automation={automation} mode="view" />;
      case "usecases": return <UseCasesEntity automation={automation} cases={cases} mode="view" />;
      default: return null;
    }
  };

  return (
    <div data-automation-page="view">
      {/* HERO — centered, the page's identity (the same description the cockpit shows). */}
      <section className="mx-auto max-w-2xl space-y-3 px-4 py-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="text-base text-muted-foreground">{description}</p>}
      </section>

      {/* THE CONSOLE — the interaction plane (ask by voice or words), full-width like the cockpit. */}
      <ControlPanelEntity automation={automation} mode="view" initial={controlPanel} />

      {/* THE DIAGRAM — the read-only living canvas. */}
      <DiagramEntity nodes={nodes} automation={automation} mode="view" />

      {/* THE SECTIONS — every visible entity, view mode, in the owner's order. */}
      <div className="mx-auto w-[85vw] max-w-full space-y-3 px-4 py-6">
        {shown.map((k) => {
          const content = body(k as EntityKey);
          if (!content) return null;
          return (
            <EntitySection
              key={k}
              id={k}
              title={sectionTitle(k as EntityKey)}
              tooltip={sectionTooltip(k as EntityKey)}
              presence="collapsed"
            >
              {content}
            </EntitySection>
          );
        })}
      </div>
    </div>
  );
}
