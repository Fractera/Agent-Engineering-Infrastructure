"use client";

import type { DashboardConfig } from "../table-config";
import { DashboardEntity } from "../entities/dashboard";

// COMPAT WRAPPER (step 254.2) — the dashboard entity moved to the view/admin/container pattern at
// _shared/entities/dashboard/ (ROUTE-V3 law 3). This name stays because the example automations and the
// accordion monolith import it; it IS the admin composition now — one logic source, zero duplication.
export function DashboardAccordion({ automation, dashboard }: { automation: string; dashboard?: DashboardConfig }) {
  return <DashboardEntity automation={automation} dashboard={dashboard} mode="admin" />;
}
