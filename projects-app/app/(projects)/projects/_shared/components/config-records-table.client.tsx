"use client";

import type { DashboardTable } from "../table-config";
import { DashboardTableView } from "../entities/dashboard/view/table";
import { useDashboardTableAdmin } from "../entities/dashboard/admin/chrome";

// COMPAT WRAPPER (step 254.2) — the universal dashboard table moved to the view/admin split at
// _shared/entities/dashboard/ (view/table.tsx = the read-only core; admin/chrome.tsx = the row
// mutations). This name stays for existing imports and composes the ADMIN variant, exactly the old
// behavior — one logic source, zero duplication.
export function ConfigRecordsTable({ automation, table }: { automation: string; table: DashboardTable }) {
  const { bridge, modals } = useDashboardTableAdmin({ automation, table });
  return (
    <>
      <DashboardTableView automation={automation} table={table} admin={bridge} />
      {modals}
    </>
  );
}
