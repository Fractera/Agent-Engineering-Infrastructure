import { join } from "node:path";
import { allGraphAutomations } from "@/lib/graph-store";
import { projectsRoot, resolveProject } from "@/lib/nodes";
import { appendRecord, compactIfNeeded, foldJournal, type JournalRecord } from "@/lib/jsonl-store";
import { createNodeId } from "@/lib/cuid";
import type { TableRow } from "@/app/(projects)/projects/_shared/table-config";

// THE DASHBOARD LIVE DATA STORE (step 229; moved to the automation's own journal in block 4b,
// owner 2026-07-20) — the rows behind the config-driven dashboard tables (228).
//
// A row is a JSON blob keyed by the column's `source`, exactly as before: the universal table renders
// whatever the config's columns pull out of it, and a table with no live rows falls back to the config's
// seed rows. What changed is WHERE they live: `_data/runtime/rows.jsonl` inside the automation, instead of
// the dashboard_rows table. Same append-only journal as the runs (lib/jsonl-store.ts) — rows are written by
// the automation's own nodes while the owner is reading the table, so appends must not block or clobber.
//
// An edit appends a new line with the same id (the reader folds); a delete appends a tombstone. Nothing is
// rewritten in place, so a row being edited can never be half-written when someone reads it.

const PAGE = 20;

type RowRecord = JournalRecord & { table_id: string; values_json: string; created_at: string };

function journalPath(automation: string): string | null {
  const proj = resolveProject(automation);
  return proj.ok ? join(proj.projectDir, "_data", "runtime", "rows.jsonl") : null;
}

async function allRows(automation: string): Promise<RowRecord[]> {
  const file = journalPath(automation);
  if (!file) return [];
  return [...(await foldJournal(file)).values()].filter((r) => r.__kind === "row") as RowRecord[];
}

function parse(r: RowRecord): TableRow {
  let values: Record<string, unknown> = {};
  try { values = JSON.parse(r.values_json) as Record<string, unknown>; } catch { /* corrupt row → empty */ }
  return { id: r.id, values };
}

/** Newest first — the order the table renders in (created_at desc, id desc as the stable tiebreaker). */
const byNewest = (a: RowRecord, b: RowRecord) =>
  String(b.created_at).localeCompare(String(a.created_at)) || String(b.id).localeCompare(String(a.id));

export async function rowCount(automation: string, tableId: string): Promise<number> {
  return (await allRows(automation)).filter((r) => r.table_id === tableId).length;
}

/** A page of live rows, newest first. Search is a case-insensitive substring over the row's stringified
 *  values — good enough for a JSON-blob store and independent of which columns a table declares. */
export async function listRows(
  automation: string,
  tableId: string,
  opts: { search?: string; offset?: number; limit?: number } = {},
): Promise<{ rows: TableRow[]; hasMore: boolean }> {
  const offset = Math.max(0, opts.offset ?? 0);
  const limit = opts.limit ?? PAGE;
  const search = (opts.search ?? "").trim().toLowerCase();

  let rows = (await allRows(automation)).filter((r) => r.table_id === tableId);
  if (search) rows = rows.filter((r) => String(r.values_json).toLowerCase().includes(search));
  rows.sort(byNewest);

  const page = rows.slice(offset, offset + limit + 1);
  const hasMore = page.length > limit;
  return { rows: page.slice(0, limit).map(parse), hasMore };
}

export async function addRow(automation: string, tableId: string, values: Record<string, unknown>): Promise<TableRow> {
  const id = createNodeId();
  const file = journalPath(automation);
  if (!file) return { id, values: values ?? {} };
  await appendRecord(file, {
    id, __kind: "row",
    table_id: tableId, values_json: JSON.stringify(values ?? {}), created_at: new Date().toISOString(),
  });
  void compactIfNeeded(file);
  return { id, values: values ?? {} };
}

/** The row APIs address a row by id alone (the UI never sends the automation with it), so the automation is
 *  found by scanning the journals — a handful of automations, and only the two single-row routes pay it. */
async function ownerOf(id: string): Promise<{ automation: string; row: RowRecord } | null> {
  for (const automation of await allGraphAutomations(projectsRoot())) {
    const row = (await allRows(automation)).find((r) => r.id === id);
    if (row) return { automation, row };
  }
  return null;
}

export async function deleteRow(id: string): Promise<boolean> {
  const found = await ownerOf(id);
  if (!found) return false;
  const file = journalPath(found.automation);
  if (!file) return false;
  await appendRecord(file, { id, __kind: "row", __del: true });
  void compactIfNeeded(file);
  return true;
}

export async function patchRow(id: string, values: Record<string, unknown>): Promise<boolean> {
  const found = await ownerOf(id);
  if (!found) return false;
  const file = journalPath(found.automation);
  if (!file) return false;
  let prev: Record<string, unknown> = {};
  try { prev = JSON.parse(found.row.values_json) as Record<string, unknown>; } catch { /* start fresh */ }
  await appendRecord(file, {
    id, __kind: "row", table_id: found.row.table_id,
    values_json: JSON.stringify({ ...prev, ...values }),
  });
  void compactIfNeeded(file);
  return true;
}
