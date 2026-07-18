"use client";

import { useUiLang } from "../../use-ui-lang";
import { automationMenuStrings } from "../../automation-menu-i18n";
import { requirementScope } from "../../requirement-scope-i18n";
import { RequirementBriefPanel } from "../../components/requirement-brief-panel.client";
import { CalendarView } from "./view/calendar";
import { CalendarInstruction } from "./admin/chrome";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3 — breaking this breaks the whole chain, FORBIDDEN):
// the CONTAINER is the ONLY place view and admin compose. Never move admin chrome into view files,
// never import another entity. Enforced by `npm run check:entity-imports`.
//
// THE CALENDAR ENTITY CONTAINER (step 254.4):
//   mode="view"  — the read-only month grid + daily planner alone (a visitor browses the calendar);
//   mode="admin" — the same core framed by the owner's instruction banner + the requirement panel
//                  (the AI build surface for this entity).
export type CalendarMode = "view" | "admin";

export function CalendarEntity({ automation, mode }: { automation: string; mode: CalendarMode }) {
  const lang = useUiLang();
  const M = automationMenuStrings(lang);
  if (mode === "view") {
    return (
      <div className="space-y-3" data-entity-mode="view" data-entity-section="calendar">
        <CalendarView automation={automation} />
      </div>
    );
  }
  return (
    <div className="space-y-3" data-entity-mode="admin" data-entity-section="calendar">
      <CalendarInstruction />
      <CalendarView automation={automation} />
      <RequirementBriefPanel
        entityType="calendar"
        entityLabel={M.entities.calendar.label}
        scopeLabel={requirementScope(lang, "calendar")}
        automation={automation}
      />
    </div>
  );
}
