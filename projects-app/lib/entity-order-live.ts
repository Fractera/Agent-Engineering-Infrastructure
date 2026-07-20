import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { resolveProject } from "@/lib/nodes";

// THE ENTITY-ORDER LIVE STORE (step 241, owner; moved to the filesystem in block 3, owner 2026-07-20) —
// the order in which the owner dragged this automation's sections. Twin of lib/entities-live.ts: the
// DEFAULT_ENTITY_ORDER is the seed, this file wins once the owner drags, and writing never triggers a
// rebuild. Stored RAW (the resolve/merge with the default lives in entities.ts, shared by reader and
// writer) — this file is pure storage, one JSON array in the automation's own `_data/entity-order.json`.

const filePath = (automation: string): string | null => {
  const proj = resolveProject(automation);
  return proj.ok ? join(proj.projectDir, "_data", "entity-order.json") : null;
};

export async function getEntityOrder(automation: string): Promise<string[] | null> {
  const p = filePath(automation);
  if (!p) return null;
  try {
    const parsed = JSON.parse(await readFile(p, "utf8")) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : null;
  } catch {
    return null; // no file yet → the default order applies
  }
}

export async function setEntityOrder(automation: string, order: string[]): Promise<void> {
  const p = filePath(automation);
  if (!p) return;
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
  await mkdir(dirname(p), { recursive: true });
  await writeFile(tmp, `${JSON.stringify(order, null, 2)}\n`, "utf8");
  await rename(tmp, p);
}
