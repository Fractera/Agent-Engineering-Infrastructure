"use client";

import { useUiLang } from "../../use-ui-lang";
import { cronStrings } from "../../cron-i18n";
import { automationMenuStrings } from "../../automation-menu-i18n";
import { requirementScope } from "../../requirement-scope-i18n";
import { RequirementBriefPanel } from "../../components/requirement-brief-panel.client";
import { CronStatusView, useCronState } from "./view/status";
import { CronControls } from "./admin/chrome";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3 — breaking this breaks the whole chain, FORBIDDEN):
// the CONTAINER is the ONLY place view and admin compose. Never move admin chrome into view files,
// never import another entity. Enforced by `npm run check:entity-imports`.
//
// THE CRON ENTITY CONTAINER (step 254.5):
//   mode="view"  — the read-only schedule status (whether and how often this automation self-wakes);
//   mode="admin" — the description + the schedule CONTROLS (cron.json writes) + the requirement panel.
export type CronMode = "view" | "admin";

export function CronEntity({ automation, mode }: { automation: string; mode: CronMode }) {
  const lang = useUiLang();
  const L = cronStrings(lang);
  const M = automationMenuStrings(lang);
  const [state, patch] = useCronState(automation);

  if (mode === "view") {
    return (
      <div className="space-y-3" data-entity-mode="view" data-entity-section="cron">
        <CronStatusView state={state} />
      </div>
    );
  }
  return (
    <div className="space-y-3" data-entity-mode="admin" data-entity-section="cron">
      <p className="text-sm text-muted-foreground">{L.description}</p>
      <CronControls automation={automation} state={state} patch={patch} />
      <RequirementBriefPanel
        entityType="cron"
        entityLabel={M.entities.cron.label}
        scopeLabel={requirementScope(lang, "cron")}
        automation={automation}
      />
    </div>
  );
}
