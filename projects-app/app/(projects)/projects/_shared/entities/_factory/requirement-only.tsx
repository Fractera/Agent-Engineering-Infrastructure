"use client";

import { useUiLang } from "../../use-ui-lang";
import { automationMenuStrings } from "../../automation-menu-i18n";
import { requirementScope, type RequirementScopeKey } from "../../requirement-scope-i18n";
import { RequirementBriefPanel } from "../../components/requirement-brief-panel.client";
import type { EntityKey } from "../../entities";
import type { EntityType } from "@/lib/entity-store";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3 — breaking this breaks the whole chain, FORBIDDEN):
// this FACTORY is base-layer machinery shared by requirement-only entities (map, analytics, …) — it is
// NOT an entity and must never import one. An entity folder may import it; the reverse never happens.
//
// THE REQUIREMENT-ONLY ENTITY FACTORY (step 254.7) — the container for entities that have NO interface
// yet: their whole admin surface is the requirement panel ("the next thing I need here"), and their view
// surface is an honest placeholder (the entity's own 10-language tooltip — what this section will be).
// When such an entity grows a real interface, it graduates to its own view/+admin/ folders and stops
// using this factory.
export type RequirementOnlyMode = "view" | "admin";

export function RequirementOnlyEntity({
  automation, entityKey, mode,
}: {
  automation: string;
  /** Also the architecture-bundle entity id (ROUTE-V3 law 2: one vocabulary). */
  entityKey: EntityKey & RequirementScopeKey & EntityType;
  mode: RequirementOnlyMode;
}) {
  const lang = useUiLang();
  const M = automationMenuStrings(lang);
  const meta = M.entities[entityKey];

  if (mode === "view") {
    return (
      <div className="space-y-3" data-entity-mode="view" data-entity-section={entityKey}>
        <p className="text-sm text-muted-foreground" data-requirement-only-view="placeholder">{meta.tooltip}</p>
      </div>
    );
  }
  return (
    <div className="space-y-3" data-entity-mode="admin" data-entity-section={entityKey}>
      <RequirementBriefPanel
        entityType={entityKey}
        entityLabel={meta.label}
        scopeLabel={requirementScope(lang, entityKey)}
        automation={automation}
      />
    </div>
  );
}
