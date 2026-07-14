import { db } from "@/lib/db";
import type { EntityKey, EntitiesConfig } from "@/app/(projects)/projects/_shared/entities";

// THE ENTITIES LIVE OVERRIDE STORE (step 237) — one JSON-blob row per automation (class-immunity to
// live-ALTER, lesson 225 G4, same shape as dashboard_rows). The project's _data/config.ts is the SEED; a
// row here, once written, WINS for that key — merged client-side by `use-entities-live.ts`. Writing here
// never touches the filesystem, so a switch flip needs no rebuild (owner requirement — the automation page
// is statically prerendered).

type Row = { entities_json: string };

export async function getLiveEntities(automation: string): Promise<Partial<EntitiesConfig>> {
  const row = (await db
    .prepare(`SELECT entities_json FROM automation_entities WHERE automation = ?`)
    .get(automation)) as Row | undefined;
  if (!row) return {};
  try {
    return JSON.parse(row.entities_json) as Partial<EntitiesConfig>;
  } catch {
    return {};
  }
}

/** Read-modify-write a single key; returns the full merged live map so the caller can broadcast it. */
export async function setLiveEntity(
  automation: string,
  key: EntityKey,
  value: boolean,
): Promise<Partial<EntitiesConfig>> {
  const current = await getLiveEntities(automation);
  const merged = { ...current, [key]: value };
  await db
    .prepare(
      `INSERT INTO automation_entities (automation, entities_json, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(automation) DO UPDATE SET entities_json = excluded.entities_json, updated_at = excluded.updated_at`,
    )
    .run(automation, JSON.stringify(merged));
  return merged;
}
