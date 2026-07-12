import { db } from "@/lib/db";
import { createNodeId } from "@/lib/cuid";
import type { TableRow } from "@/app/(projects)/projects/_shared/table-config";

// THE DASHBOARD LIVE DATA STORE (step 229) — the rows behind the config-driven dashboard tables (228). A
// row is NOT a column-per-field (arbitrary columns + a live server that cannot ALTER — lesson 225 G4): every
// field lives inside values_json, keyed by the column's `source`. The universal table renders whatever the
// config's columns pull out of it. A table with no live rows falls back to the config's seed rows (the demo
// fallback); the moment a row is written here, the live rows replace the seed. Both the automation's nodes
// (via the API) and the owner (via the UI) write here.

const PAGE = 20;

type DbRow = { id: string; values_json: string; created_at: string };

function parse(r: DbRow): TableRow {
  let values: Record<string, unknown> = {};
  try { values = JSON.parse(r.values_json) as Record<string, unknown>; } catch { /* corrupt row → empty */ }
  return { id: r.id, values };
}

export async function rowCount(automation: string, tableId: string): Promise<number> {
  const r = (await db
    .prepare(`SELECT COUNT(*) AS n FROM dashboard_rows WHERE automation = ? AND table_id = ?`)
    .get(automation, tableId)) as { n: number };
  return r.n;
}

/** A page of live rows, newest first. Search is a case-insensitive substring over the row's stringified
 *  values_json — good enough for a JSON-blob store and independent of which columns a table declares. */
export async function listRows(
  automation: string,
  tableId: string,
  opts: { search?: string; offset?: number; limit?: number } = {},
): Promise<{ rows: TableRow[]; hasMore: boolean }> {
  const offset = Math.max(0, opts.offset ?? 0);
  const limit = opts.limit ?? PAGE;
  const search = (opts.search ?? "").trim().toLowerCase();

  const where = search
    ? `WHERE automation = ? AND table_id = ? AND LOWER(values_json) LIKE ?`
    : `WHERE automation = ? AND table_id = ?`;
  const args = search ? [automation, tableId, `%${search}%`] : [automation, tableId];

  const rows = (await db
    .prepare(`SELECT id, values_json, created_at FROM dashboard_rows ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
    .all(...args, limit + 1, offset)) as DbRow[];

  const hasMore = rows.length > limit;
  return { rows: rows.slice(0, limit).map(parse), hasMore };
}

export async function addRow(automation: string, tableId: string, values: Record<string, unknown>): Promise<TableRow> {
  const id = createNodeId();
  await db
    .prepare(`INSERT INTO dashboard_rows (id, automation, table_id, values_json) VALUES (?, ?, ?, ?)`)
    .run(id, automation, tableId, JSON.stringify(values ?? {}));
  return { id, values: values ?? {} };
}

export async function deleteRow(id: string): Promise<boolean> {
  const r = (await db.prepare(`DELETE FROM dashboard_rows WHERE id = ?`).run(id)) as { changes?: number };
  return (r.changes ?? 0) > 0;
}

export async function patchRow(id: string, values: Record<string, unknown>): Promise<boolean> {
  const existing = (await db.prepare(`SELECT values_json FROM dashboard_rows WHERE id = ?`).get(id)) as
    | { values_json: string }
    | undefined;
  if (!existing) return false;
  let prev: Record<string, unknown> = {};
  try { prev = JSON.parse(existing.values_json) as Record<string, unknown>; } catch { /* start fresh */ }
  const merged = { ...prev, ...values };
  await db.prepare(`UPDATE dashboard_rows SET values_json = ? WHERE id = ?`).run(JSON.stringify(merged), id);
  return true;
}
