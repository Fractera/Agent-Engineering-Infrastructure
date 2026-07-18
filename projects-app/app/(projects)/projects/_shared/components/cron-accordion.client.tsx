"use client";

import { CronEntity } from "../entities/cron";

// COMPAT WRAPPER (step 254.5) — the cron entity moved to the view/admin/container pattern at
// _shared/entities/cron/ (ROUTE-V3 law 3). Kept only for any out-of-tree import; the accordion monolith
// uses CronEntity directly. IS the full admin composition.
export function CronAccordion({ automation }: { automation: string }) {
  return <CronEntity automation={automation} mode="admin" />;
}
