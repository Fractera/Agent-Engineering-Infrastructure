import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { resolveProject } from "@/lib/nodes";
import type { EntityKey, EntitiesConfig } from "@/app/(projects)/projects/_shared/entities";

// THE ENTITIES LIVE OVERRIDE STORE (step 237; moved to the filesystem in block 3 of the refactor,
// owner 2026-07-20) — the owner's on/off switches for this automation's sections.
//
// It lives in the automation's OWN folder: `_data/entities.json`. Two reasons it is a separate file rather
// than an edit to `_data/config.ts`:
//   · config.ts is a TS module compiled into the statically prerendered page — changing it would need a
//     rebuild, and a switch must flip instantly (the owner's requirement, and the reason this store exists);
//   · config.ts is the BIRTH SEED, this file is the owner's later choice. Both are read by ONE merge
//     (`use-entities-live.ts`, override wins per key), so this is layering, not the two-truths drift that
//     blocks 1 and 2 removed — nobody has to keep them in step.
//
// It used to be a JSON blob in the automation_entities table; now it sits next to the automation it belongs
// to, where the owner (and the coding agent in its room) can simply read it.

type Live = Partial<EntitiesConfig>;

const filePath = (automation: string): string | null => {
  const proj = resolveProject(automation);
  return proj.ok ? join(proj.projectDir, "_data", "entities.json") : null;
};

export async function getLiveEntities(automation: string): Promise<Live> {
  const p = filePath(automation);
  if (!p) return {};
  try {
    const parsed = JSON.parse(await readFile(p, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Live) : {};
  } catch {
    return {};
  }
}

/** Read-modify-write a single key; returns the full merged live map so the caller can broadcast it. */
export async function setLiveEntity(
  automation: string,
  key: EntityKey,
  value: boolean,
): Promise<Live> {
  const p = filePath(automation);
  if (!p) return {};
  const merged = { ...(await getLiveEntities(automation)), [key]: value };
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
  await mkdir(dirname(p), { recursive: true });
  await writeFile(tmp, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  await rename(tmp, p); // atomic — a reader never catches a half-written switch map
  return merged;
}
