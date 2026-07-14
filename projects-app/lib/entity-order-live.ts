import { db } from "@/lib/db";

// THE ENTITY-ORDER LIVE STORE (step 241, owner) — one JSON-array row per automation holding the owner's
// dragged section order. Twin of lib/entities-live.ts (the on/off switches): DEFAULT_ENTITY_ORDER is the
// SEED, a row here wins once the owner drags, and writing never touches the filesystem, so a reorder needs
// no rebuild. Stored RAW (the resolve/merge with the default lives in entities.ts, shared by both the reader
// and the writer) — this file is pure storage.

type Row = { order_json: string };

export async function getEntityOrder(automation: string): Promise<string[] | null> {
  const row = (await db
    .prepare(`SELECT order_json FROM automation_entity_order WHERE automation = ?`)
    .get(automation)) as Row | undefined;
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.order_json);
    return Array.isArray(parsed) ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}

export async function setEntityOrder(automation: string, order: string[]): Promise<void> {
  await db
    .prepare(
      `INSERT INTO automation_entity_order (automation, order_json, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(automation) DO UPDATE SET order_json = excluded.order_json, updated_at = excluded.updated_at`,
    )
    .run(automation, JSON.stringify(order));
}
