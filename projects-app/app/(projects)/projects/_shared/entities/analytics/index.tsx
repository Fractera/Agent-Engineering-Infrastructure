"use client";

import { useUiLang } from "../../use-ui-lang";
import { automationMenuStrings } from "../../automation-menu-i18n";
import { requirementScope } from "../../requirement-scope-i18n";
import { RequirementBriefPanel } from "../../components/requirement-brief-panel.client";
import { RequestsPerDayChart } from "./view/requests-chart";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3): the container composes only; never import another entity.
//
// THE ANALYTICS ENTITY CONTAINER (step 254.8b, owner's spec — graduated from the requirement-only
// factory): ONE shadcn-style bar chart of requests per day from the live History rows.
//   mode="view"  — the chart alone (a visitor sees how alive the automation is);
//   mode="admin" — the chart + the requirement panel (order more analytics from the AI).
export function AnalyticsEntity({ automation, mode }: { automation: string; mode: "view" | "admin" }) {
  const lang = useUiLang();
  const M = automationMenuStrings(lang);
  if (mode === "view") {
    return (
      <div className="space-y-3" data-entity-mode="view" data-entity-section="analytics">
        <RequestsPerDayChart automation={automation} />
      </div>
    );
  }
  return (
    <div className="space-y-3" data-entity-mode="admin" data-entity-section="analytics">
      <RequestsPerDayChart automation={automation} />
      <RequirementBriefPanel
        entityType="analytics"
        entityLabel={M.entities.analytics.label}
        scopeLabel={requirementScope(lang, "analytics")}
        automation={automation}
      />
    </div>
  );
}
