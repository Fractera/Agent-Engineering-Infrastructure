"use client";

import { useCallback, useEffect, useState } from "react";
import { Columns2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardConfig, DashboardTable } from "../table-config";
import { ConfigRecordsTable } from "./config-records-table.client";
import { useUiLang } from "../use-ui-lang";
import { resolveLocalized } from "../localized-text";
import { automationMenuStrings } from "../automation-menu-i18n";

// THE DASHBOARD (step 228 + the telegram-notes standard). ONE tab that holds ANY number of tables, but only
// ONE is shown at a time, behind a row of toggle buttons — exactly like the reference automation
// (records-finances-panel: Records · Finances · Images · GEO). Tables never stack on top of each other.
//
// SPLIT VIEW (owner, new): a button splits the space into TWO columns, each with its OWN table picker — so
// you can compare two tables side by side (and it is fine for the same table to be on both sides). The
// choice (which table, and split on/off) is remembered per browser (localStorage).
function TablePicker({
  tables, value, onChange, lang,
}: { tables: DashboardTable[]; value: string; onChange: (id: string) => void; lang: string }) {
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

function DashboardPane({
  automation, tables, value, onChange,
}: { automation: string; tables: DashboardTable[]; value: string; onChange: (id: string) => void }) {
  const lang = useUiLang();
  const table = tables.find((t) => t.id === value) ?? tables[0];
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate font-medium">{resolveLocalized(table.title, lang)}</h4>
          {table.description && <p className="truncate text-xs text-muted-foreground">{resolveLocalized(table.description, lang)}</p>}
        </div>
        <TablePicker tables={tables} value={table.id} onChange={onChange} lang={lang} />
      </div>
      <ConfigRecordsTable automation={automation} table={table} />
    </div>
  );
}

export function DashboardAccordion({ automation, dashboard }: { automation: string; dashboard?: DashboardConfig }) {
  const lang = useUiLang();
  const M = automationMenuStrings(lang);
  const tables = dashboard?.tables ?? [];
  const STORAGE = `dashboard-view:${automation}`;

  const [left, setLeft] = useState<string>("");
  const [right, setRight] = useState<string>("");
  const [split, setSplit] = useState(false);

  useEffect(() => {
    if (!tables.length) return;
    const first = tables[0].id;
    const second = tables[1]?.id ?? first;
    try {
      const raw = localStorage.getItem(STORAGE);
      const s = raw ? (JSON.parse(raw) as { left?: string; right?: string; split?: boolean }) : null;
      const has = (id?: string) => !!id && tables.some((t) => t.id === id);
      setLeft(has(s?.left) ? (s!.left as string) : first);
      setRight(has(s?.right) ? (s!.right as string) : second);
      setSplit(Boolean(s?.split));
    } catch {
      setLeft(first);
      setRight(second);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automation, tables.length]);

  const persist = useCallback((next: { left?: string; right?: string; split?: boolean }) => {
    const state = { left, right, split, ...next };
    if (next.left !== undefined) setLeft(next.left);
    if (next.right !== undefined) setRight(next.right);
    if (next.split !== undefined) setSplit(next.split);
    try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch { /* not persisted */ }
  }, [left, right, split, STORAGE]);

  if (!tables.length) {
    return <p className="text-sm text-muted-foreground">{M.dashboardEmpty}</p>;
  }
  if (!left) return null; // first paint, before the stored choice is read

  return (
    <div className="space-y-3">
      {/* One table at a time (the telegram-notes standard) — or two side by side when split. */}
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => persist({ split: !split })}>
          {split ? <Square className="size-3.5" /> : <Columns2 className="size-3.5" />}
          {split ? M.dashboardSingleView : M.dashboardTwoView}
        </Button>
      </div>

      <div className={split ? "grid gap-6 lg:grid-cols-2" : ""}>
        <DashboardPane automation={automation} tables={tables} value={left} onChange={(id) => persist({ left: id })} />
        {split && (
          <DashboardPane automation={automation} tables={tables} value={right} onChange={(id) => persist({ right: id })} />
        )}
      </div>
    </div>
  );
}
