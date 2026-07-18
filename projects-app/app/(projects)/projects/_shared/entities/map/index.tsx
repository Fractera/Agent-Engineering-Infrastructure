"use client";

import { RequirementOnlyEntity, type RequirementOnlyMode } from "../_factory/requirement-only";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3): the container composes only; never import another entity.
//
// THE MAP ENTITY CONTAINER (step 254.7) — requirement-only for now: no interface exists yet, so admin =
// the requirement panel, view = the honest 10-language placeholder. When the map grows a real interface,
// it graduates to its own view/ + admin/ folders (the dashboard/calendar pattern) and leaves the factory.
export function MapEntity({ automation, mode }: { automation: string; mode: RequirementOnlyMode }) {
  return <RequirementOnlyEntity automation={automation} entityKey="map" mode={mode} />;
}
