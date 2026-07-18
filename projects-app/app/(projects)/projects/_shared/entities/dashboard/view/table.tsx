"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ChevronDown, Columns3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { defaultVisibleColumnIds, tableStorageKey, type DashboardTable, type TableColumn, type TableRow } from "../../../table-config";
import { ConfigRecordCell } from "../../../components/config-record-cell.client";
import { LiveLookupDialog } from "../../../components/live-lookup-dialog.client";
import { useRunRefresh } from "../../../use-run-refresh";
import { useUiLang } from "../../../use-ui-lang";
import { resolveLocalized } from "../../../localized-text";

// THE DASHBOARD TABLE — VIEW CORE (step 254.2, ROUTE-V3 law 3). The PUBLIC, read-only universal table:
// live rows + seed fallback, debounced search, pagination, column picker, detail dialog, read-only live
// lookup. It carries ZERO mutation code. Admin chrome (add/edit/delete) attaches ONLY through the
// declared TableAdminBridge points below — the one-arrow law: admin/ imports this file, this file never
// imports admin/ (enforced by scripts/check-entity-imports.mjs).

/** Fill `{field}` tokens in an `action:"live"` column's `liveUrl` from that row's own stored values. */
function resolveLiveUrl(template: string, row: TableRow): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => encodeURIComponent(String(row.values[key] ?? "")));
}

const API = "/api/projects/dashboard/rows";
const SEARCH_MIN_CHARS = 3;
const SEARCH_IDLE_MS = 3000;

/** The DECLARED attachment points admin chrome may use — the whole coupling surface, nothing else. */
export type TableAdminBridge = {
  /** Rendered in the toolbar (the "Add row" button lives here in admin mode). */
  headerExtra?: ReactNode;
  /** Row click (admin edit). The view calls it only for LIVE rows — seed/demo rows stay read-only. */
  onRowClick?: (row: TableRow) => void;
  rowClickTitle?: string;
  /** The delete cell action. Absent (view mode) → the delete action explains it is read-only. */
  onDeleteRow?: (row: TableRow, isLive: boolean) => void;
  /** Bump to make the view reload page 0 (after a mutation elsewhere). */
  refreshToken?: number;
};

export function DashboardTableView({
  automation, table, admin,
}: { automation: string; table: DashboardTable; admin?: TableAdminBridge }) {
  const lang = useUiLang();
  const seed = useMemo<TableRow[]>(() => table.rows ?? [], [table.rows]);
  const storageKey = tableStorageKey(automation, table);
  const pageSize = table.pageSize ?? 20;

  const [rows, setRows] = useState<TableRow[]>(seed);
  const [isLive, setIsLive] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [search, setSearch] = useState("");
  const [visibleIds, setVisibleIds] = useState<string[]>(() => defaultVisibleColumnIds(table.columns));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ open: boolean; row: TableRow | null }>({ open: false, row: null });
  const [liveTarget, setLiveTarget] = useState<{ url: string; title: string } | null>(null);

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

  // Admin refresh bridge: a mutation in the chrome bumps the token; the view reloads page 0.
  useEffect(() => {
    if (admin?.refreshToken === undefined) return;
    void loadLive(search, 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin?.refreshToken]);

  // Live refresh (step 243.2): a successful run elsewhere on this page may have written a row here.
  useRunRefresh(automation, useCallback(() => { void loadLive(search, 0, false); }, [loadLive, search]));

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

  // Debounced search (step 243) — empty box reloads instantly; 3+ chars fire after 3s idle.
  useEffect(() => {
    if (search.length > 0 && search.length < SEARCH_MIN_CHARS) return;
    const delay = search.length === 0 ? 0 : SEARCH_IDLE_MS;
    const t = setTimeout(() => void loadLive(search, 0, false), delay);
    return () => clearTimeout(t);
  }, [search, loadLive]);

  const rowClickable = Boolean(admin?.onRowClick) && isLive;

  return (
    <div className="space-y-3" data-dashboard-table={table.id}>
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
                {resolveLocalized(c.header, lang)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {admin?.headerExtra}
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
                <th key={c.id} className="whitespace-nowrap px-3 py-2 font-medium">{resolveLocalized(c.header, lang)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(cols.length, 1)} className="px-3 py-6 text-center text-muted-foreground">
                  No records yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className={"border-b align-top last:border-0 " + (rowClickable ? "cursor-pointer hover:bg-muted/40" : "")}
                  onClick={rowClickable ? () => admin!.onRowClick!(r) : undefined}
                  title={rowClickable ? admin?.rowClickTitle : undefined}
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
                          onDelete: (row) => {
                            if (admin?.onDeleteRow) admin.onDeleteRow(row, isLive);
                            else toast.info("Read-only view.");
                          },
                          onLive: (row, col2: TableColumn) => {
                            if (!col2.options?.liveUrl) return;
                            setLiveTarget({ url: resolveLiveUrl(col2.options.liveUrl, row), title: resolveLocalized(col2.header, lang) });
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
                  <span className="w-32 shrink-0 text-muted-foreground">{resolveLocalized(c.header, lang)}</span>
                  <span className="whitespace-pre-wrap">{String(detail.row!.values[c.source] ?? "—")}</span>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
