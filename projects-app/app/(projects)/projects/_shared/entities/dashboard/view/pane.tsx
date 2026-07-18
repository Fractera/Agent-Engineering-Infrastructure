"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { DashboardTable } from "../../../table-config";
import { useUiLang } from "../../../use-ui-lang";
import { resolveLocalized } from "../../../localized-text";
import { DashboardTableView, type TableAdminBridge } from "./table";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3 — breaking this breaks the whole chain, FORBIDDEN):
// VIEW file — never import admin/ or another entity; admin enters only via the declared points
// (`admin` bridge + `paneExtra`). Enforced by `npm run check:entity-imports`; never weaken the gate.
//
// THE DASHBOARD PANE — VIEW CORE (step 254.2): title + description + the table picker + the table.
// Visitor-safe: picking which table to look at is a READ act. Admin chrome enters only through the
// declared points: the table's admin bridge and the `paneExtra` slot (the per-table requirement panel
// lives there in admin mode).

export function TablePicker({
  tables, value, onChange,
}: { tables: DashboardTable[]; value: string; onChange: (id: string) => void }) {
  const lang = useUiLang();
  return (
    <div className="inline-flex flex-wrap rounded-md border p-0.5">
      {tables.map((t) => (
        <Button
          key={t.id}
          size="sm"
          variant={t.id === value ? "secondary" : "ghost"}
          className="h-7 px-2 text-xs"
          onClick={() => onChange(t.id)}
        >
          {resolveLocalized(t.title, lang)}
        </Button>
      ))}
    </div>
  );
}

export function DashboardPaneView({
  automation, tables, value, onChange, admin, paneExtra,
}: {
  automation: string;
  tables: DashboardTable[];
  value: string;
  onChange: (id: string) => void;
  admin?: TableAdminBridge;
  paneExtra?: ReactNode;
}) {
  const lang = useUiLang();
  const table = tables.find((t) => t.id === value) ?? tables[0];
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate font-medium">{resolveLocalized(table.title, lang)}</h4>
          {table.description && <p className="truncate text-xs text-muted-foreground">{resolveLocalized(table.description, lang)}</p>}
        </div>
        <TablePicker tables={tables} value={table.id} onChange={onChange} />
      </div>
      <DashboardTableView automation={automation} table={table} admin={admin} />
      {paneExtra}
    </div>
  );
}
