"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DashboardTable, TableRow } from "../../../table-config";
import { useUiLang } from "../../../use-ui-lang";
import { resolveLocalized } from "../../../localized-text";
import type { TableAdminBridge } from "../view/table";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3 — breaking this breaks the whole chain, FORBIDDEN):
// ADMIN file — may import view/ (the allowed direction), must NEVER be imported by view/ and never
// reach into another entity. Attach to the view ONLY through its declared bridge points — never patch
// admin behavior into a view file "for convenience". Enforced by `npm run check:entity-imports`.
//
// THE DASHBOARD ADMIN CHROME (step 254.2, ROUTE-V3 law 3) — every row MUTATION of the dashboard table:
// the Add/Edit dialog, the delete action, and the bridge that plugs them into the view core's declared
// points. This side imports view/ freely; view/ never imports this file (the one-arrow law).

const API = "/api/projects/dashboard/rows";

export function useDashboardTableAdmin({
  automation, table,
}: { automation: string; table: DashboardTable }): { bridge: TableAdminBridge; modals: ReactNode } {
  const lang = useUiLang();
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
        ? await fetch(`${API}/${editingId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ values }),
          })
        : await fetch(API, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ automation, table: table.id, values }),
          });
      if (!r.ok) { toast.error(editingId ? "Could not save the row." : "Could not add the row."); return; }
      setAdding(false);
      setEditingId(null);
      setDraft({});
      setRefreshToken((t) => t + 1);
      toast.success(editingId ? "Row saved." : "Row added.");
    } finally { setBusy(false); }
  }, [automation, table.id, editableCols, draft, editingId]);

  const deleteRow = useCallback(async (row: TableRow, isLive: boolean) => {
    if (!isLive) { toast.info("Demo rows are read-only — add a real row first."); return; }
    try {
      const r = await fetch(`${API}/${row.id}`, { method: "DELETE" });
      if (!r.ok) { toast.error("Could not delete the row."); return; }
      setRefreshToken((t) => t + 1);
      toast.success("Row deleted.");
    } catch { toast.error("Could not delete the row."); }
  }, []);

  const bridge: TableAdminBridge = {
    headerExtra: (
      <Button variant="outline" size="sm" onClick={openAdd} data-dashboard-admin="add-row">
        <Plus className="mr-1 size-4" /> Add row
      </Button>
    ),
    onRowClick: openEdit,
    rowClickTitle: "Click to edit this row",
    onDeleteRow: (row, isLive) => void deleteRow(row, isLive),
    refreshToken,
  };

  const modals = (
    <Dialog open={adding} onOpenChange={setAdding}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editingId ? "Edit row" : "Add a row"} — “{resolveLocalized(table.title, lang)}”</DialogTitle></DialogHeader>
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
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} {editingId ? "Save changes" : "Add row"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return { bridge, modals };
}
