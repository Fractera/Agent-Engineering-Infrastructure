"use client";

import { useState, useEffect } from "react";
import { Loader2, Pencil, Trash2, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Row = Record<string, unknown>;
type Props = { onClose: () => void };

const SIDEBAR_W = 250;

const ALL_ROLES = ["architect", "user", "guest"];

const SELECT_COLUMNS: Record<string, Record<string, string[]>> = {
  users: {
    is_active: ["1", "0"],
    provider:  ["credentials", "google", "github", "guest"],
    locale:    ["en", "ru", "es", "fr", "de", "zh"],
  },
};

const MULTI_COLUMNS: Record<string, Record<string, string[]>> = {
  users: {
    roles: ALL_ROLES,
  },
};

function getSelectOptions(table: string, column: string): string[] | null {
  return SELECT_COLUMNS[table]?.[column] ?? null;
}

function getMultiOptions(table: string, column: string): string[] | null {
  return MULTI_COLUMNS[table]?.[column] ?? null;
}

export function DbBrowserPanel({ onClose }: Props) {
  const [tables, setTables]               = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [columns, setColumns]             = useState<string[]>([]);
  const [rows, setRows]                   = useState<Row[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingRows, setLoadingRows]     = useState(false);
  const [deleteRowId, setDeleteRowId]     = useState<string | null>(null);
  const [editCell, setEditCell]           = useState<{ rowId: string; column: string; value: string } | null>(null);
  const [editValue, setEditValue]         = useState("");
  const [editSaving, setEditSaving]       = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetch("/api/db/tables")
      .then((r) => r.json())
      .then((d) => {
        setTables(d.tables ?? []);
        if (d.tables?.length) selectTable(d.tables[0]);
      })
      .catch(() => toast.error("Failed to load tables"))
      .finally(() => setLoadingTables(false));
  }, []);

  async function selectTable(table: string) {
    setSelectedTable(table);
    setRows([]);
    setColumns([]);
    setLoadingRows(true);
    try {
      const res  = await fetch(`/api/db/tables/${table}`);
      const data = await res.json();
      setColumns(data.columns ?? []);
      setRows(data.rows ?? []);
    } catch {
      toast.error("Failed to load rows");
    } finally {
      setLoadingRows(false);
    }
  }

  function openEdit(rowId: string, column: string, value: unknown) {
    const str = value === null || value === undefined ? "" : String(value);
    setEditCell({ rowId, column, value: str });
    setEditValue(str);
  }

  async function saveEdit() {
    if (!editCell || !selectedTable) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/db/tables/${selectedTable}/${editCell.rowId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ column: editCell.column, value: editValue }),
      });
      if (!res.ok) throw new Error("Save failed");
      setRows((prev) => prev.map((r) =>
        String(r.id) === editCell.rowId ? { ...r, [editCell.column]: editValue } : r
      ));
      toast.success("Cell updated");
      setEditCell(null);
    } catch {
      toast.error("Failed to save");
    } finally {
      setEditSaving(false);
    }
  }

  async function confirmDelete(id: string) {
    if (!selectedTable) return;
    try {
      await fetch(`/api/db/tables/${selectedTable}/${id}`, { method: "DELETE" });
      setRows((prev) => prev.filter((r) => String(r.id) !== id));
      toast.success("Row deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleteRowId(null);
    }
  }

  function getCheckedRoles(): string[] {
    try { return JSON.parse(editValue) as string[]; } catch { return []; }
  }

  function toggleRole(role: string) {
    const current = getCheckedRoles();
    const next = current.includes(role)
      ? current.filter((r) => r !== role)
      : [...current, role];
    setEditValue(JSON.stringify(next));
  }

  return (
    <div style={{ position: "absolute", top: 52, left: 0, right: 0, bottom: 36, zIndex: 20 }}
      className="bg-background flex flex-col">

      {/* ── Edit cell overlay ── */}
      {editCell && selectedTable && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
          <div className="bg-background rounded-xl p-5 flex flex-col gap-3 shadow-xl mx-4 w-full max-w-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Edit <span className="font-mono text-primary">{editCell.column}</span>
              </span>
              <Button variant="ghost" size="icon-xs" onClick={() => setEditCell(null)}>
                <X size={13} />
              </Button>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              {selectedTable} · id: {editCell.rowId}
            </span>

            {getMultiOptions(selectedTable, editCell.column) ? (
              <div className="flex flex-col gap-1.5">
                {getMultiOptions(selectedTable, editCell.column)!.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer text-[11px] text-foreground">
                    <input
                      type="checkbox"
                      checked={getCheckedRoles().includes(opt)}
                      onChange={() => toggleRole(opt)}
                      className="accent-primary"
                    />
                    {opt}
                  </label>
                ))}
                <span className="text-[10px] text-muted-foreground font-mono mt-1">{editValue}</span>
              </div>
            ) : getSelectOptions(selectedTable, editCell.column) ? (
              <select
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="h-8 rounded-lg border border-border bg-muted px-2.5 text-[11px] font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                {getSelectOptions(selectedTable, editCell.column)!.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={4}
                className="rounded-lg border border-border bg-muted px-2.5 py-1.5 text-[11px] font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
              />
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setEditCell(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveEdit} disabled={editSaving}>
                {editSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm overlay ── */}
      {deleteRowId && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
          <div className="bg-background rounded-xl p-5 flex flex-col gap-3 shadow-xl mx-4">
            <span className="text-xs font-semibold text-foreground">Delete this row?</span>
            <span className="text-[10px] text-muted-foreground font-mono">id: {deleteRowId}</span>
            <span className="text-[11px] text-muted-foreground">This action cannot be undone.</span>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteRowId(null)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={() => confirmDelete(deleteRowId)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-foreground">Database</span>
        {selectedTable && (
          <>
            <span className="mx-2 text-muted-foreground/40 text-xs">/</span>
            <span className="text-xs font-mono text-primary">{selectedTable}</span>
            <span className="ml-2 text-[10px] text-muted-foreground font-mono">{rows.length} rows</span>
          </>
        )}
        <span className="flex-1" />
        <button type="button" onClick={onClose}
          className="flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <X size={13} />
        </button>
      </div>

      {/* ── Body ── */}
      {loadingTables ? (
        <div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground text-xs">
          <Loader2 size={13} className="animate-spin" />Loading…
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 overflow-x-auto">

          <div
            style={{ width: sidebarCollapsed ? 40 : SIDEBAR_W, minWidth: sidebarCollapsed ? 40 : SIDEBAR_W, transition: "width 0.2s ease, min-width 0.2s ease" }}
            className="border-r border-border flex flex-col overflow-y-auto shrink-0 sticky left-0 bg-background z-10 relative">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="absolute top-1.5 right-1.5 z-10"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={12} /> : <PanelLeftClose size={12} />}
            </Button>
            {!sidebarCollapsed && (
              <div className="flex flex-col pt-2 overflow-hidden">
                {tables.map((t) => (
                  <button key={t} type="button" onClick={() => selectTable(t)}
                    className={`text-left px-4 py-2 text-[11px] font-mono transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${
                      selectedTable === t
                        ? "bg-primary/10 text-primary border-r-2 border-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 overflow-x-auto">
            {loadingRows ? (
              <div className="flex items-center justify-center h-full gap-2 text-muted-foreground text-xs">
                <Loader2 size={13} className="animate-spin" />Loading rows…
              </div>
            ) : !selectedTable ? (
              <div className="flex items-center justify-center h-full text-[11px] text-muted-foreground">
                Select a table
              </div>
            ) : rows.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[11px] text-muted-foreground">
                No rows in {selectedTable}
              </div>
            ) : (
              <table className="text-[11px] border-collapse" style={{ minWidth: "100%" }}>
                <thead>
                  <tr className="border-b border-border bg-muted/50 sticky top-0 z-[5]">
                    {columns.map((col) => (
                      <th key={col} className="text-left px-3 py-2 font-mono font-medium text-muted-foreground whitespace-nowrap border-r border-border last:border-r-0 min-w-[120px]">
                        {col}
                      </th>
                    ))}
                    <th className="px-3 py-2 w-8 sticky right-0 bg-muted/50 border-l border-border" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-border hover:bg-muted/30 transition-colors group">
                      {columns.map((col) => (
                        <td key={col} className="px-3 py-1.5 border-r border-border max-w-[200px]">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="truncate font-mono text-foreground flex-1" title={String(row[col] ?? "")}>
                              {row[col] === null || row[col] === undefined
                                ? <span className="text-muted-foreground/40">null</span>
                                : String(row[col])}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => openEdit(String(row.id), col, row[col])}
                              className="shrink-0 opacity-0 group-hover:opacity-100"
                            >
                              <Pencil size={10} />
                            </Button>
                          </div>
                        </td>
                      ))}
                      <td className="px-2 sticky right-0 bg-background group-hover:bg-muted/30 border-l border-border transition-colors">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleteRowId(String(row.id))}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={11} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
