"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ChevronDown, Columns3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAGE_SIZE, minWidthOf } from "../../../shared/data-table.client";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EntityDrawer, type DrawerTarget } from "../../../shared/entity-drawer.client";
import { defaultVisibleColumnIds, tableStorageKey, type DashboardTable, type TableColumn, type TableRow } from "../../table-config";
import { ConfigRecordCell } from "./config-record-cell.client";
import { LiveLookupDialog } from "./live-lookup-dialog.client";
import { useRunRefresh } from "./use-run-refresh";
import { resolveLocalized } from "../../localized-text";
import { dashboardAdminStrings } from "../../i18n";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3 — breaking this breaks the whole chain, FORBIDDEN):
// this is a VIEW file — it must NEVER import admin/ (its own or any entity's) and NEVER import another
// entity. Admin chrome attaches ONLY through the declared bridge points below. The container (../index)
// is the only place view and admin compose. `npm run check:entity-imports` enforces this — never weaken
// the gate to make an import pass.
//
// THE DASHBOARD TABLE — VIEW CORE (step 254.2, ROUTE-V3 law 3). The PUBLIC, read-only universal table:
// live rows + seed fallback, debounced search, pagination, column picker, detail dialog, read-only live
// lookup. It carries ZERO mutation code. Admin chrome (add/edit/delete) attaches ONLY through the
// declared TableAdminBridge points below — the one-arrow law: admin/ imports this file, this file never
// imports admin/ (enforced by scripts/check-entity-imports.mjs).

/** Fill `{field}` tokens in an `action:"live"` column's `liveUrl` from that row's own stored values. */
function resolveLiveUrl(template: string, row: TableRow): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => encodeURIComponent(String(row.values[key] ?? "")));
}

// ДВЕРЬ СТРОК — СВОЯ у каждой автоматизации (`<адрес страницы>/api/rows`), а не платформенная как в v1:
// строки живут В ПАПКЕ автоматизации (`_data/runtime/rows.jsonl`), и читает их её собственная дверь.
const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";
const SEARCH_MIN_CHARS = 3;
const SEARCH_IDLE_MS = 3000;

/** Плоская строка v2 (`{id, table, createdAt, ...значения}`) → форма таблицы (`{id, values}`). */
const toTableRow = (r: Record<string, unknown>): TableRow => ({ id: String(r.id), values: r });

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
  automation, table, admin, lang,
}: { automation: string; table: DashboardTable; admin?: TableAdminBridge; lang: string }) {
  const L = dashboardAdminStrings(lang);
  const seed = useMemo<TableRow[]>(() => table.rows ?? [], [table.rows]);
  const storageKey = tableStorageKey(automation, table);
  const pageSize = table.pageSize ?? PAGE_SIZE; // общий закон таблиц: страница — 10 записей

  const [rows, setRows] = useState<TableRow[]>(seed);
  const [isLive, setIsLive] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  // Общий интерфейс таблиц: страницы, а не «показать ещё». Дверь `api/rows` отдаёт `total`, поэтому
  // навигация здесь такая же нумерованная, как у базы, хранилища и памяти.
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [visibleIds, setVisibleIds] = useState<string[]>(() => defaultVisibleColumnIds(table.columns));
  const [expanded, setExpanded] = useState<string | null>(null);
  // ЯЩИК СУЩНОСТИ — ОБЩИЙ (шаг 328.5). Свой диалог деталей у дашборда был вторым домом одного факта: он
  // показывал колонки ТОЙ ЖЕ строки и ничего не знал о её соседях, тогда как владелец от строки ждёт всю
  // сущность. Диалог удалён, строка и кнопка «подробнее» ведут в тот же ящик, что и в остальных вкладках.
  const [target, setTarget] = useState<DrawerTarget>(null);
  const [liveTarget, setLiveTarget] = useState<{ url: string; title: string } | null>(null);

  const loadLive = useCallback(async (q: string, offset: number, append: boolean) => {
    try {
      const r = await fetch(
        `${apiBase()}/rows?table=${encodeURIComponent(table.id)}&search=${encodeURIComponent(q)}&offset=${offset}&limit=${pageSize}`,
        { cache: "no-store" },
      );
      if (!r.ok) return;
      const d = (await r.json()) as { rows: Record<string, unknown>[]; hasMore: boolean; total?: number; source: "runtime" | "empty" };
      if (d.source === "runtime") {
        const live = d.rows.map(toTableRow);
        setRows((prev) => (append ? [...prev, ...live] : live));
        setLoadedCount((prev) => (append ? prev + live.length : live.length));
        setIsLive(true);
        setHasMore(d.hasMore);
        setTotal(d.total ?? live.length);
      } else {
        setIsLive(false);
        setHasMore(false);
        setLoadedCount(0);
        setTotal(0);
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
            <Button variant="outline" size="sm"><Columns3 className="mr-1 size-4" /> {L.columns}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>{L.showColumns}</DropdownMenuLabel>
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
          <span className="rounded border border-dashed px-2 py-0.5 text-xs text-muted-foreground" title={L.demoReadOnly}>
            {L.demo}
          </span>
        )}
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={L.search} className="ml-auto max-w-xs" />
      </div>

      {/* Wide tables scroll horizontally (owner requirement) — never squash the columns. */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-max min-w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              {cols.map((c) => (
                <th key={c.id} className="whitespace-nowrap px-3 py-2 font-medium" style={{ minWidth: minWidthOf(c.type) }}>{resolveLocalized(c.header, lang)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(cols.length, 1)} className="px-3 py-6 text-center text-muted-foreground">
                  {L.noRecords}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer border-b align-top transition-colors last:border-0 hover:bg-muted/40"
                  // Кокпит может занять клик своей работой (выбор строки); во всех прочих случаях строка
                  // открывает ЯЩИК СУЩНОСТИ — то же, что в базе, хранилище, памяти и на карте. Клик по
                  // кнопке внутри ячейки ящик не открывает: у них своя работа.
                  onClick={(e) => {
                    if (rowClickable) { admin!.onRowClick!(r); return; }
                    if ((e.target as HTMLElement).closest("button,a,input,select,textarea")) return;
                    setTarget({ table: table.id, id: r.id });
                  }}
                  title={rowClickable ? admin?.rowClickTitle : undefined}
                >
                  {cols.map((c) => (
                    // Общий закон таблиц: ячейка не выше четырёх строк, дальше обрыв. Картинки, действия и
                    // бейджи не обрезаются — у них своя высота, обрыв сломал бы их.
                    <td
                      key={c.id}
                      className={"px-3 py-2 " + (["image", "actions", "badge"].includes(c.type) ? "" : "[&>*]:line-clamp-4 [&>*]:break-words")}
                      style={{ minWidth: minWidthOf(c.type) }}
                    >
                      <ConfigRecordCell
                        col={c}
                        lang={lang}
                        row={r}
                        ctx={{
                          expanded: expanded === r.id,
                          onToggleExpand: () => setExpanded(expanded === r.id ? null : r.id),
                          onDetail: (row) => setTarget({ table: table.id, id: row.id }),
                          onDelete: (row) => {
                            if (admin?.onDeleteRow) admin.onDeleteRow(row, isLive);
                            else toast.info(L.readOnlyView);
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

      {/* Общий интерфейс таблиц: нумерованные страницы по 10 записей тем же примитивом shadcn, что у базы,
          хранилища и памяти. «Показать ещё» убрано — две разные навигации это два разных интерфейса. */}
      {isLive && total > pageSize ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} / {total}
          </span>
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  disabled={page === 0 || loadingMore}
                  onClick={() => { const p = page - 1; setPage(p); void loadLive(search, p * pageSize, false); }}
                />
              </PaginationItem>
              {Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => i)
                .filter((i) => i === 0 || i === Math.ceil(total / pageSize) - 1 || Math.abs(i - page) <= 1)
                .map((i, idx, arr) => (
                  <PaginationItem key={i}>
                    {idx > 0 && i - arr[idx - 1] > 1 ? <span className="px-1 text-muted-foreground">…</span> : null}
                    <PaginationLink
                      isActive={i === page}
                      onClick={() => { setPage(i); void loadLive(search, i * pageSize, false); }}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
              <PaginationItem>
                <PaginationNext
                  disabled={(page + 1) * pageSize >= total || loadingMore}
                  onClick={() => { const p = page + 1; setPage(p); void loadLive(search, p * pageSize, false); }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}

      <LiveLookupDialog
        open={!!liveTarget}
        url={liveTarget?.url ?? null}
        title={liveTarget?.title ?? ""}
        onClose={() => setLiveTarget(null)}
      />

      <EntityDrawer target={target} onClose={() => setTarget(null)} lang={lang} />
    </div>
  );
}
