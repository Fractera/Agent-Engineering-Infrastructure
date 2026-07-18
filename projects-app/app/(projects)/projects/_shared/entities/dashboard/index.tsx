"use client";

import { useCallback, useEffect, useState } from "react";
import { Columns2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardConfig, DashboardTable } from "../../table-config";
import { useUiLang } from "../../use-ui-lang";
import { automationMenuStrings } from "../../automation-menu-i18n";
import { requirementScope } from "../../requirement-scope-i18n";
import { resolveLocalized } from "../../localized-text";
import { RequirementBriefPanel } from "../../components/requirement-brief-panel.client";
import { DashboardPaneView } from "./view/pane";
import { useDashboardTableAdmin } from "./admin/chrome";

// THE DASHBOARD ENTITY CONTAINER (step 254.2, ROUTE-V3 law 3) — the pilot of the view/admin/container
// pattern. ONE component, TWO compositions:
//   mode="view"  — the public core alone: pane + read-only table (a visitor's dashboard);
//   mode="admin" — the same core with the chrome plugged into its declared points: Add/Edit/Delete rows +
//                  the per-table requirement panel (the AI build surface).
// Split view (one table or two side by side) is presentation, not privilege — it lives here, in the
// container, for both modes. The choice is remembered per browser (localStorage), exactly as before.
export type DashboardMode = "view" | "admin";

function AdminPane({
  automation, tables, value, onChange,
}: { automation: string; tables: DashboardTable[]; value: string; onChange: (id: string) => void }) {
  const lang = useUiLang();
  const table = tables.find((t) => t.id === value) ?? tables[0];
  const { bridge, modals } = useDashboardTableAdmin({ automation, table });
  return (
    <>
      <DashboardPaneView
        automation={automation}
        tables={tables}
        value={value}
        onChange={onChange}
        admin={bridge}
        paneExtra={
          <div data-dashboard-admin="requirement-panel">
            <RequirementBriefPanel
              entityType="dashboard"
              entityLabel={resolveLocalized(table.title, lang)}
              scopeLabel={requirementScope(lang, "table")}
              automation={automation}
              refId={table.id}
            />
          </div>
        }
      />
      {modals}
    </>
  );
}

export function DashboardEntity({
  automation, dashboard, mode,
}: { automation: string; dashboard?: DashboardConfig; mode: DashboardMode }) {
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

  const Pane = mode === "admin" ? AdminPane : DashboardPaneView;

  return (
    <div className="space-y-3" data-entity-mode={mode}>
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => persist({ split: !split })}>
          {split ? <Square className="size-3.5" /> : <Columns2 className="size-3.5" />}
          {split ? M.dashboardSingleView : M.dashboardTwoView}
        </Button>
      </div>

      <div className={split ? "grid gap-6 lg:grid-cols-2" : ""}>
        <Pane automation={automation} tables={tables} value={left} onChange={(id) => persist({ left: id })} />
        {split && (
          <Pane automation={automation} tables={tables} value={right} onChange={(id) => persist({ right: id })} />
        )}
      </div>
    </div>
  );
}
