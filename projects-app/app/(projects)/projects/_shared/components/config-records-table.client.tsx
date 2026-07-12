"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Columns3, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { defaultVisibleColumnIds, tableStorageKey, type DashboardTable, type TableRow } from "../table-config";
import { ConfigRecordCell } from "./config-record-cell.client";

// The UNIVERSAL dashboard table (step 228 + LIVE data store, step 229) — ONE component for every automation,
// driven entirely by CONFIG (DashboardTable). Columns are DATA; the user toggles column VISIBILITY via the
// picker (personal, localStorage per table); wide tables scroll HORIZONTALLY (overflow-x).
//
// LIVE ROWS (229): on mount it fetches the automation's live rows from the DB. If any exist, they REPLACE
// the config's seed rows; while the store is empty it shows the seed (the demo fallback, so a fresh
// dashboard is never blank). The owner adds rows with "Add row" and deletes a live row via the delete
// action; the automation's own nodes write rows through the same API. Live rows need no rebuild — the data
// is in the DB, not in a file.
const API = "/api/projects/dashboard/rows";

export function ConfigRecordsTable({ automation, table }: { automation: string; table: DashboardTable }) {
  const seed = useMemo<TableRow[]>(() => table.rows ?? [], [table.rows]);
  const storageKey = tableStorageKey(automation, table);

  const [rows, setRows] = useState<TableRow[]>(seed);
  const [isLive, setIsLive] = useState(false);
  const [search, setSearch] = useState("");
  const [visibleIds, setVisibleIds] = useState<string[]>(() => defaultVisibleColumnIds(table.columns));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ open: boolean; row: TableRow | null }>({ open: false, row: null });
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Load the live rows; fall back to the seed while the store is empty.
  const loadLive = useCallback(async (q: string) => {
    try {
      const r = await fetch(`${API}?automation=${encodeURIComponent(automation)}&table=${encodeURIComponent(table.id)}&search=${encodeURIComponent(q)}`, { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { rows: TableRow[]; source: "live" | "empty" };
      if (d.source === "live") { setRows(d.rows); setIsLive(true); }
      else { setIsLive(false); setRows(q.trim() ? seed.filter((row) => Object.values(row.values).some((v) => String(v ?? "").toLowerCase().includes(q.toLowerCase()))) : seed); }
    } catch { /* keep whatever is shown */ }
  }, [automation, table.id, seed]);

  useEffect(() => { void loadLive(""); }, [loadLive]);

  // Restore the user's personal column choice for this table.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setVisibleIds(JSON.parse(saved) as string[]);
    } catch { /* keep the config defaults */ }
  }, [storageKey]);

  const setVisible = useCallback((ids: string[]) => {
    setVisibleIds(ids);
    try { localStorage.setItem(storageKey, JSON.stringify(ids)); } catch { /* not persisted */ }
  }, [storageKey]);

  const cols = useMemo(() => table.columns.filter((c) => visibleIds.includes(c.id)), [table.columns, visibleIds]);
  const shown = rows;

  // Debounced search: live rows search on the server; seed rows filter on the client (inside loadLive).
  useEffect(() => {
    const t = setTimeout(() => void loadLive(search), 300);
    return () => clearTimeout(t);
  }, [search, loadLive]);

  // "Add row" — one field per non-actions column; POST creates a live row (which then replaces the seed).
  const editableCols = useMemo(() => table.columns.filter((c) => c.type !== "actions"), [table.columns]);
  const addRow = useCallback(async () => {
    setBusy(true);
    try {
      const values: Record<string, unknown> = {};
      for (const c of editableCols) {
        const raw = draft[c.source] ?? "";
        values[c.source] = c.type === "number" ? (raw === "" ? "" : Number(raw)) : raw;
      }
      const r = await fetch(API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, table: table.id, values }),
      });
      if (!r.ok) { toast.error("Could not add the row."); return; }
      setAdding(false);
      setDraft({});
      await loadLive(search);
      toast.success("Row added.");
    } finally { setBusy(false); }
  }, [automation, table.id, editableCols, draft, loadLive, search]);

  const deleteRow = useCallback(async (row: TableRow) => {
    if (!isLive) { toast.info("Demo rows are read-only — add a real row first."); return; }
    try {
      const r = await fetch(`${API}/${row.id}`, { method: "DELETE" });
      if (!r.ok) { toast.error("Could not delete the row."); return; }
      setRows((prev) => prev.filter((x) => x.id !== row.id));
      toast.success("Row deleted.");
    } catch { toast.error("Could not delete the row."); }
  }, [isLive]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm"><Columns3 className="mr-1 size-4" /> Columns</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Show columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table.columns.map((c) => (
              <DropdownMenuCheckboxItem
                key={c.id}
                checked={visibleIds.includes(c.id)}
                onCheckedChange={(on) => setVisible(on ? [...visibleIds, c.id] : visibleIds.filter((id) => id !== c.id))}
                onSelect={(e) => e.preventDefault()}
              >
                {c.header}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus className="mr-1 size-4" /> Add row
        </Button>
        {!isLive && rows.length > 0 && (
          <span className="rounded border border-dashed px-2 py-0.5 text-xs text-muted-foreground" title="These are demo rows from the config — add a real row to start the live table.">
            demo
          </span>
        )}
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="ml-auto max-w-xs" />
      </div>

      {/* Wide tables scroll horizontally (owner requirement) — never squash the columns. */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              {cols.map((c) => (
                <th key={c.id} className="whitespace-nowrap px-3 py-2 font-medium">{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={Math.max(cols.length, 1)} className="px-3 py-6 text-center text-muted-foreground">
                  No records yet.
                </td>
              </tr>
            ) : (
              shown.map((r) => (
                <tr key={r.id} className="border-b align-top last:border-0">
                  {cols.map((c) => (
                    <td key={c.id} className="px-3 py-2">
                      <ConfigRecordCell
                        col={c}
                        row={r}
                        ctx={{
                          expanded: expanded === r.id,
                          onToggleExpand: () => setExpanded(expanded === r.id ? null : r.id),
                          onDetail: (row) => setDetail({ open: true, row }),
                          onDelete: (row) => void deleteRow(row),
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={detail.open} onOpenChange={(o) => setDetail((d) => ({ ...d, open: o }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Row detail</DialogTitle></DialogHeader>
          <div className="max-h-96 space-y-1 overflow-y-auto text-sm">
            {detail.row &&
              table.columns.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <span className="w-32 shrink-0 text-muted-foreground">{c.header}</span>
                  <span className="whitespace-pre-wrap">{String(detail.row!.values[c.source] ?? "—")}</span>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add row (step 229) — one field per non-actions column; a POST creates a LIVE row, which replaces
          the demo seed from now on. Fields are typed loosely (all strings; number columns parse on submit). */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add a row to “{table.title}”</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {editableCols.map((c) => (
              <div key={c.id} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{c.header} <span className="opacity-60">({c.type})</span></label>
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
            <Button onClick={addRow} disabled={busy} className="w-full">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add row
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
