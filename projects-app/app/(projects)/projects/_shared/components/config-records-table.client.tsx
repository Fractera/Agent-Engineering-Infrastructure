"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { defaultVisibleColumnIds, tableStorageKey, type DashboardTable, type TableRow } from "../table-config";
import { ConfigRecordCell } from "./config-record-cell.client";

// The UNIVERSAL dashboard table (step 228) — ONE component for every automation, driven entirely by CONFIG
// (DashboardTable). Columns are DATA; the user toggles column VISIBILITY via the picker (personal,
// localStorage per table); wide tables scroll HORIZONTALLY (overflow-x). This is the telegram-notes
// RecordsTable generalized: it renders the config's seed rows (the live per-table data store is a later
// step), so it has no dependency on any one automation's API.
export function ConfigRecordsTable({ automation, table }: { automation: string; table: DashboardTable }) {
  const rows = useMemo<TableRow[]>(() => table.rows ?? [], [table.rows]);
  const storageKey = tableStorageKey(automation, table);

  const [search, setSearch] = useState("");
  const [visibleIds, setVisibleIds] = useState<string[]>(() => defaultVisibleColumnIds(table.columns));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ open: boolean; row: TableRow | null }>({ open: false, row: null });

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

  // Client-side search over the seed rows (the live store's server search is the later step).
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => Object.values(r.values).some((v) => String(v ?? "").toLowerCase().includes(q)));
  }, [rows, search]);

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
                          onDelete: () => { /* seed rows are read-only until the live data store (later step) */ },
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
    </div>
  );
}
