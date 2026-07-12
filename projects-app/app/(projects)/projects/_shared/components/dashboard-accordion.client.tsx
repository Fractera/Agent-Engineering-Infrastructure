"use client";

import type { DashboardConfig } from "../table-config";
import { ConfigRecordsTable } from "./config-records-table.client";

// THE DASHBOARD (step 228) — ONE accordion that holds ANY number of tables. The dashboard is a single tab;
// how many tables it shows, and what columns each draws, is decided by the CONFIG (PROJECT_CONFIG.dashboard),
// not by the data. Each table is the universal ConfigRecordsTable (column-visibility in localStorage,
// horizontal scroll for wide tables). A fresh automation is born with one demo table; the model adds the
// tables an automation actually needs to analyse its work when it is designed (Quiz / decomposition).
export function DashboardAccordion({ automation, dashboard }: { automation: string; dashboard?: DashboardConfig }) {
  const tables = dashboard?.tables ?? [];
  if (!tables.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No tables configured yet. A dashboard holds any number of tables; each is declared in the project&rsquo;s
        <code className="mx-1">_data/config.ts</code> and rendered through the shared table standard — see the
        project README, &ldquo;The dashboard tables &amp; columns standard&rdquo;.
      </p>
    );
  }
  return (
    <div className="space-y-6">
      {tables.map((t) => (
        <section key={t.id} className="space-y-2">
          <div>
            <h4 className="font-medium">{t.title}</h4>
            {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
          </div>
          <ConfigRecordsTable automation={automation} table={t} />
        </section>
      ))}
    </div>
  );
}
