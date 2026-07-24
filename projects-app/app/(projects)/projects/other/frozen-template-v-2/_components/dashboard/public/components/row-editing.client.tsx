"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DashboardTable, TableRow } from "../../table-config";
import { resolveLocalized } from "../../localized-text";
import { dashboardAdminStrings } from "../../i18n";
import type { TableAdminBridge } from "./table.client";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3 — breaking this breaks the whole chain, FORBIDDEN):
// ADMIN file — may import view/ (the allowed direction), must NEVER be imported by view/ and never
// reach into another entity. Attach to the view ONLY through its declared bridge points — never patch
// admin behavior into a view file "for convenience". Enforced by `npm run check:entity-imports`.
//
// THE DASHBOARD ADMIN CHROME (step 254.2, ROUTE-V3 law 3) — every row MUTATION of the dashboard table:
// the Add/Edit dialog, the delete action, and the bridge that plugs them into the view core's declared
// points. This side imports view/ freely; view/ never imports this file (the one-arrow law).

// ДВЕРЬ СТРОК — СВОЯ у каждой автоматизации (`<адрес страницы>/api/rows`): создать `PUT {table, values}`,
// править `POST {table, id, set}`, удалить `DELETE ?table&id`. Платформенного стора как в v1 здесь нет —
// строки живут в папке автоматизации.
const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";

export function useDashboardTableAdmin({
  automation, table,
}: { automation: string; table: DashboardTable; lang: string }): { bridge: TableAdminBridge; modals: ReactNode } {
  const L = dashboardAdminStrings(lang);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // null = add, an id = edit that live row
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const editableCols = useMemo(() => table.columns.filter((c) => c.type !== "actions"), [table.columns]);

  const openAdd = useCallback(() => { setEditingId(null); setDraft({}); setAdding(true); }, []);

  const openEdit = useCallback((row: TableRow) => {
    const d: Record<string, string> = {};
    for (const c of editableCols) {
      const v = row.values[c.source];
      d[c.source] = v === null || v === undefined ? "" : String(v);
    }
    setDraft(d);
    setEditingId(row.id);
    setAdding(true);
  }, [editableCols]);

  const submitRow = useCallback(async () => {
    setBusy(true);
    try {
      const values: Record<string, unknown> = {};
      for (const c of editableCols) {
        const raw = draft[c.source] ?? "";
        values[c.source] = c.type === "number" ? (raw === "" ? "" : Number(raw)) : raw;
      }
      const r = editingId
        ? await fetch(`${apiBase()}/rows`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ table: table.id, id: editingId, set: values }),
          })
        : await fetch(`${apiBase()}/rows`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ table: table.id, values }),
          });
      if (!r.ok) { toast.error(editingId ? L.saveFailed : L.addFailed); return; }
      setAdding(false);
      setEditingId(null);
      setDraft({});
      setRefreshToken((t) => t + 1);
      toast.success(editingId ? L.rowSaved : L.rowAdded);
    } finally { setBusy(false); }
  }, [automation, table.id, editableCols, draft, editingId]);

  const deleteRow = useCallback(async (row: TableRow, isLive: boolean) => {
    if (!isLive) { toast.info(L.demoReadOnly); return; }
    try {
      const r = await fetch(`${apiBase()}/rows?table=${encodeURIComponent(table.id)}&id=${encodeURIComponent(row.id)}`, { method: "DELETE" });
      if (!r.ok) { toast.error(L.deleteFailed); return; }
      setRefreshToken((t) => t + 1);
      toast.success(L.rowDeleted);
    } catch { toast.error(L.deleteFailed); }
  }, [table.id]);

  const bridge: TableAdminBridge = {
    headerExtra: (
      <Button variant="outline" size="sm" onClick={openAdd} data-dashboard-admin="add-row">
        <Plus className="mr-1 size-4" /> {L.addRow}
      </Button>
    ),
    onRowClick: openEdit,
    rowClickTitle: L.clickToEdit,
    onDeleteRow: (row, isLive) => void deleteRow(row, isLive),
    refreshToken,
  };

  const modals = (
    <Dialog open={adding} onOpenChange={setAdding}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editingId ? L.editRow : L.addRow} — “{resolveLocalized(table.title, lang)}”</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {editableCols.map((c) => (
            <div key={c.id} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{resolveLocalized(c.header, lang)} <span className="opacity-60">({c.type})</span></label>
              {c.type === "longtext" ? (
                <Textarea value={draft[c.source] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [c.source]: e.target.value }))} rows={3} />
              ) : (
                <Input
                  type={c.type === "number" ? "number" : c.type === "date" ? "datetime-local" : "text"}
                  value={draft[c.source] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [c.source]: e.target.value }))}
                />
              )}
            </div>
          ))}
          <Button onClick={submitRow} disabled={busy} className="w-full">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} {editingId ? L.save : L.addRow}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return { bridge, modals };
}
