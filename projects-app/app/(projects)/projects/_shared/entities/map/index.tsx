"use client";

import { useUiLang } from "../../use-ui-lang";
import { automationMenuStrings } from "../../automation-menu-i18n";
import { requirementScope } from "../../requirement-scope-i18n";
import { RequirementBriefPanel } from "../../components/requirement-brief-panel.client";
import { EuropeMapView } from "./view/europe-map";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3): the container composes only; never import another entity.
//
// THE MAP ENTITY CONTAINER (step 254.8c, owner's spec — graduated from the requirement-only factory):
// a real open-data map (OSM tiles) with five European capital pins; a pin opens the right-side drawer
// with its one-line note.
//   mode="view"  — the map alone;
//   mode="admin" — the map + the requirement panel (order the real geo behaviour from the AI).
export function MapEntity({ automation, mode }: { automation: string; mode: "view" | "admin" }) {
  const lang = useUiLang();
  const M = automationMenuStrings(lang);
  if (mode === "view") {
    return (
      <div className="space-y-3" data-entity-mode="view" data-entity-section="map">
        <EuropeMapView />
      </div>
    );
  }
  return (
    <div className="space-y-3" data-entity-mode="admin" data-entity-section="map">
      <EuropeMapView />
      <RequirementBriefPanel
        entityType="map"
        entityLabel={M.entities.map.label}
        scopeLabel={requirementScope(lang, "map")}
        automation={automation}
      />
    </div>
  );
}
