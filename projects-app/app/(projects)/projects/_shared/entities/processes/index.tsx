"use client";

import { useCallback, useState } from "react";
import { useUiLang } from "../../use-ui-lang";
import { automationMenuStrings } from "../../automation-menu-i18n";
import { requirementScope } from "../../requirement-scope-i18n";
import { RequirementBriefPanel } from "../../components/requirement-brief-panel.client";
import { ProcessesTimelineView } from "./view/timeline";
import { RunResetControls } from "./admin/chrome";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3 — breaking this breaks the whole chain, FORBIDDEN):
// the CONTAINER is the ONLY place view and admin compose. Never move admin chrome into view files,
// never import another entity. Enforced by `npm run check:entity-imports`.
//
// THE PROCESSES ENTITY CONTAINER (step 254.6):
//   mode="view"  — the Gantt timeline alone (watch the forks run; navigation clicks stay);
//   mode="admin" — the same timeline with Run/Reset in its toolbar + the requirement panel.
export type ProcessesMode = "view" | "admin";

export function ProcessesEntity({ automation, mode }: { automation: string; mode: ProcessesMode }) {
  const lang = useUiLang();
  const M = automationMenuStrings(lang);
  const [refreshToken, setRefreshToken] = useState(0);
  const bump = useCallback(() => setRefreshToken((t) => t + 1), []);

  if (mode === "view") {
    return (
      <div className="space-y-3" data-entity-mode="view" data-entity-section="processes">
        <ProcessesTimelineView automation={automation} />
      </div>
    );
  }
  return (
    <div className="space-y-3" data-entity-mode="admin" data-entity-section="processes">
      <ProcessesTimelineView
        automation={automation}
        refreshToken={refreshToken}
        toolbarExtra={<RunResetControls automation={automation} onChanged={bump} />}
      />
      <RequirementBriefPanel
        entityType="processes"
        entityLabel={M.entities.processes.label}
        scopeLabel={requirementScope(lang, "processes")}
        automation={automation}
      />
    </div>
  );
}
