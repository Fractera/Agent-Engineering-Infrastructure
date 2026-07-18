"use client";

import { CalendarEntity } from "../entities/calendar";

// COMPAT WRAPPER (step 254.4) — the calendar entity moved to the view/admin/container pattern at
// _shared/entities/calendar/ (ROUTE-V3 law 3). Kept only for any out-of-tree import; the accordion
// monolith now uses CalendarEntity directly. IS the full admin composition.
export function CalendarAccordion({ automation }: { automation: string }) {
  return <CalendarEntity automation={automation} mode="admin" />;
}
