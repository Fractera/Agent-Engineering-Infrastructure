"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Columns3, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { defaultVisibleColumnIds, tableStorageKey, type DashboardTable, type TableColumn, type TableRow } from "../table-config";
import { ConfigRecordCell } from "./config-record-cell.client";
import { LiveLookupDialog } from "./live-lookup-dialog.client";

/** Fill `{field}` tokens in an `action:"live"` column's `liveUrl` from that row's own stored values. */
function resolveLiveUrl(template: string, row: TableRow): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => encodeURIComponent(String(row.values[key] ?? "")));
}

// The UNIVERSAL dashboard table (step 228 + LIVE data store, step 229) — ONE component for every automation,
// driven entirely by CONFIG (DashboardTable). Columns are DATA; the user toggles column VISIBILITY via the
// picker (personal, localStorage per table); wide tables scroll HORIZONTALLY (overflow-x).
//
// LIVE ROWS (229): on mount it fetches the automation's live rows from the DB. If any exist, they REPLACE
// the config's seed rows; while the store is empty it shows the seed (the demo fallback, so a fresh
// dashboard is never blank). The owner adds rows with "Add row" and deletes a live row via the delete
// action; the automation's own nodes write rows through the same API. Live rows need no rebuild — the data
// is in the DB, not in a file.
//
// PAGINATION + SEARCH DEBOUNCE (step 243, generalized here for every table, not just its own): newest-first
// is already the API's own sort order (nothing to do). "Load more" pages OLDER rows in, `pageSize` per page
// (a table declares its own via `table.pageSize`, default 20 — unchanged from before this table had ANY
// pagination UI at all). The search box no longer fires on every keystroke: it waits for either an EMPTY box
// (instant — "show me everything again") or at least 3 characters, and even then only fires after 3s of
// typing idle — cheap on the server, still snappy for a deliberate search.
const API = "/api/projects/dashboard/rows";
const SEARCH_MIN_CHARS = 3;
const SEARCH_IDLE_MS = 3000;

export function ConfigRecordsTable({ automation, table }: { automation: string; table: DashboardTable }) {
  const seed = useMemo<TableRow[]>(() => table.rows ?? [], [table.rows]);
  const storageKey = tableStorageKey(automation, table);
  const pageSize = table.pageSize ?? 20;

  const [rows, setRows] = useState<TableRow[]>(seed);
  const [isLive, setIsLive] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0); // how many live rows are currently shown — the next offset
  const [search, setSearch] = useState("");
  const [visibleIds, setVisibleIds] = useState<string[]>(() => defaultVisibleColumnIds(table.columns));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ open: boolean; row: TableRow | null }>({ open: false, row: null });
  const [liveTarget, setLiveTarget] = useState<{ url: string; title: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // null = add, an id = edit that live row
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Load the live rows (a page of them); fall back to the seed while the store is empty. `append` is true
  // only for "Load more" — it grows the shown list instead of replacing it.
  const loadLive = useCallback(async (q: string, offset: number, append: boolean) => {
    try {
      const r = await fetch(
        `${API}?automation=${encodeURIComponent(automation)}&table=${encodeURIComponent(table.id)}&search=${encodeURIComponent(q)}&offset=${offset}&limit=${pageSize}`,
        { cache: "no-store" },
      );
      if (!r.ok) return;
      const d = (await r.json()) as { rows: TableRow[]; hasMore: boolean; source: "live" | "empty" };
      if (d.source === "live") {
        setRows((prev) => (append ? [...prev, ...d.rows] : d.rows));
        setLoadedCount((prev) => (append ? prev + d.rows.length : d.rows.length));
        setIsLive(true);
        setHasMore(d.hasMore);
      } else {
        setIsLive(false);
        setHasMore(false);
        setLoadedCount(0);
        setRows(q.trim() ? seed.filter((row) => Object.values(row.values).some((v) => String(v ?? "").toLowerCase().includes(q.toLowerCase()))) : seed);
      }
    } catch { /* keep whatever is shown */ }
  }, [automation, table.id, pageSize, seed]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try { await loadLive(search, loadedCount, true); } finally { setLoadingMore(false); }
  }, [loadLive, search, loadedCount]);

  useEffect(() => { void loadLive("", 0, false); }, [loadLive]);

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

  // Debounced search (step 243): an EMPTY box reloads instantly ("show me everything again" is not a
  // deliberate search, no reason to wait). Anything shorter than SEARCH_MIN_CHARS never fires at all — a
  // single keystroke isn't a query yet. At SEARCH_MIN_CHARS+ characters, wait SEARCH_IDLE_MS of typing idle
  // before firing — one request per pause, not one per keystroke. Live rows search server-side; seed rows
  // filter client-side (inside loadLive).
  useEffect(() => {
    if (search.length > 0 && search.length < SEARCH_MIN_CHARS) return;
    const delay = search.length === 0 ? 0 : SEARCH_IDLE_MS;
    const t = setTimeout(() => void loadLive(search, 0, false), delay);
    return () => clearTimeout(t);
  }, [search, loadLive]);

  // The add/edit modal — one field per non-actions column. Add POSTs a new row; edit PATCHes a live row.
  const editableCols = useMemo(() => table.columns.filter((c) => c.type !== "actions"), [table.columns]);

  const openAdd = useCallback(() => { setEditingId(null); setDraft({}); setAdding(true); }, []);
  // Editing (step 229 UI): a click on a LIVE row opens it pre-filled; seed/demo rows stay read-only.
  const openEdit = useCallback((row: TableRow) => {
    if (!isLive) return;
    const d: Record<string, string> = {};
    for (const c of editableCols) {
      const v = row.values[c.source];
      d[c.source] = v === null || v === undefined ? "" : String(v);
    }
    setDraft(d);
    setEditingId(row.id);
    setAdding(true);
  }, [isLive, editableCols]);

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
      await loadLive(search, 0, false);
      toast.success(editingId ? "Row saved." : "Row added.");
    } finally { setBusy(false); }
  }, [automation, table.id, editableCols, draft, editingId, loadLive, search]);

  const deleteRow = useCallback(async (row: TableRow) => {
    if (!isLive) { toast.info("Demo rows are read-only — add a real row first."); return; }
    try {
      const r = await fetch(`${API}/${row.id}`, { method: "DELETE" });
      if (!r.ok) { toast.error("Could not delete the row."); return; }
      setRows((prev) => prev.filter((x) => x.id !== row.id));
      setLoadedCount((prev) => Math.max(0, prev - 1));
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
        <Button variant="outline" size="sm" onClick={openAdd}>
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
                <tr
                  key={r.id}
                  className={"border-b align-top last:border-0 " + (isLive ? "cursor-pointer hover:bg-muted/40" : "")}
                  onClick={() => openEdit(r)}
                  title={isLive ? "Click to edit this row" : undefined}
                >
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
                          onLive: (row, col2: TableColumn) => {
                            if (!col2.options?.liveUrl) return;
                            setLiveTarget({ url: resolveLiveUrl(col2.options.liveUrl, row), title: col2.header });
                          },
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

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => void loadMore()} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="mr-1 size-4 animate-spin" /> : <ChevronDown className="mr-1 size-4" />}
            Load more
          </Button>
        </div>
      )}

      <LiveLookupDialog
        open={!!liveTarget}
        url={liveTarget?.url ?? null}
        title={liveTarget?.title ?? ""}
        onClose={() => setLiveTarget(null)}
      />

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
          <DialogHeader><DialogTitle>{editingId ? "Edit row" : "Add a row"} — “{table.title}”</DialogTitle></DialogHeader>
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
            <Button onClick={submitRow} disabled={busy} className="w-full">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} {editingId ? "Save changes" : "Add row"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
