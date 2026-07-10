"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { defaultVisibleColumnIds, type ProjectColumn } from "../_data/columns";
import { ontologyAttr } from "../_data/ontology-attrs";
import type { RecordRow } from "../_lib/types";
import { RecordCell } from "./record-cell.client";

// The UNIVERSAL records table (ontology entity 12 Record) — ONE component for every automation.
// Columns are DATA (_data/columns.ts, generated from the graph), rendered through the typed
// registry in record-cell.client.tsx. The user toggles column VISIBILITY via the picker
// (personal, localStorage); the automation declares which columns EXIST. First page is
// server-rendered (works with JS off); the client adds search / load-more / detail / delete.
const API = "/api/projects/personal/telegram-notes/records";
const STORAGE = "records-cols:personal/telegram-notes";
const PAGE = 20;

export function RecordsTable({
  columns,
  initialRows,
}: {
  columns: ProjectColumn[];
  initialRows: RecordRow[];
}) {
  const [rows, setRows] = useState<RecordRow[]>(initialRows);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(initialRows.length);
  const [hasMore, setHasMore] = useState(initialRows.length >= PAGE);
  const [loading, setLoading] = useState(false);
  const [visibleIds, setVisibleIds] = useState<string[]>(() => defaultVisibleColumnIds());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState({ open: false, text: "", loading: false });
  const [confirmDel, setConfirmDel] = useState<RecordRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Restore the user's personal column choice for this project.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE);
      if (saved) setVisibleIds(JSON.parse(saved) as string[]);
    } catch {
      /* no stored choice — keep the config defaults */
    }
  }, []);

  const setVisible = useCallback((ids: string[]) => {
    setVisibleIds(ids);
    try {
      localStorage.setItem(STORAGE, JSON.stringify(ids));
    } catch {
      /* storage unavailable — the choice just does not persist */
    }
  }, []);

  const cols = useMemo(
    () => columns.filter((c) => visibleIds.includes(c.id)),
    [columns, visibleIds],
  );

  const load = useCallback(async (q: string, from: number, replace: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}?search=${encodeURIComponent(q)}&offset=${from}`);
      const data = res.ok ? await res.json() : { rows: [], hasMore: false };
      setRows((prev) => (replace ? data.rows : [...prev, ...data.rows]));
      setOffset(from + (data.rows?.length ?? 0));
      setHasMore(Boolean(data.hasMore));
    } catch {
      toast.error("Could not load records");
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced server-side search; empty query restores the server-rendered first page.
  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== "") {
        load(search, 0, true);
      } else {
        setRows(initialRows);
        setOffset(initialRows.length);
        setHasMore(initialRows.length >= PAGE);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, load, initialRows]);

  async function openDetail(id: string) {
    setDetail({ open: true, text: "", loading: true });
    try {
      const res = await fetch(`${API}/${id}`);
      const data = res.ok ? await res.json() : { text: "" };
      setDetail({ open: true, text: String(data.text ?? ""), loading: false });
    } catch {
      setDetail({ open: true, text: "Could not load.", loading: false });
    }
  }

  async function doDelete() {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/${confirmDel.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error(`Could not delete (HTTP ${res.status})`);
        return;
      }
      const d = (await res.json().catch(() => null)) as { memoryDeleted?: boolean } | null;
      setRows((prev) => prev.filter((r) => r.id !== confirmDel.id));
      setConfirmDel(null);
      toast.success(d?.memoryDeleted ? "Record deleted (database + memory)" : "Record deleted");
    } catch {
      toast.error("Could not delete (network error)");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns3 className="mr-1 size-4" /> Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Show columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns.map((c) => {
              const attr = c.attr ? ontologyAttr(c.attr) : null;
              return (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={visibleIds.includes(c.id)}
                  onCheckedChange={(on) =>
                    setVisible(on ? [...visibleIds, c.id] : visibleIds.filter((id) => id !== c.id))
                  }
                  onSelect={(e) => e.preventDefault()}
                  title={attr?.tooltip ?? ""}
                >
                  <span>{c.header}</span>
                  {attr && (
                    <span className="ml-2 text-xs text-muted-foreground">{attr.label}</span>
                  )}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="ml-auto max-w-xs"
        />
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              {cols.map((c) => (
                <th key={c.id} className="whitespace-nowrap px-3 py-2 font-medium">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(cols.length, 1)}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  No records yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b align-top last:border-0">
                  {cols.map((c) => (
                    <td key={c.id} className="px-3 py-2">
                      <RecordCell
                        col={c}
                        row={r}
                        ctx={{
                          expanded: expanded === r.id,
                          onToggleExpand: () =>
                            setExpanded(expanded === r.id ? null : r.id),
                          onDetail: openDetail,
                          onDelete: setConfirmDel,
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
      {hasMore && search === "" && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" disabled={loading} onClick={() => load("", offset, false)}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
      <Dialog open={detail.open} onOpenChange={(o) => setDetail((d) => ({ ...d, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record detail</DialogTitle>
          </DialogHeader>
          <p className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground">
            {detail.loading ? "Loading…" : detail.text || "—"}
          </p>
        </DialogContent>
      </Dialog>
      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && !deleting && setConfirmDel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this record?</DialogTitle>
            <DialogDescription>
              This permanently removes the record from the database and from vector memory. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={deleting} onClick={() => setConfirmDel(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={doDelete}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
