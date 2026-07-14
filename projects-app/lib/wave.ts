import { pendingSteps } from "@/lib/dev-steps";
import { extractEntitySlice } from "@/lib/entity-architecture";
import { ENTITY_TYPES, type EntityType, type EntityInstance } from "@/lib/entity-store";

// THE DEVELOPMENT WAVE (step 240) — the owner's rule: handing every single edit to a coding agent one at a
// time is slow and expensive. He wants to change SEVERAL things (a dashboard requirement, then analytics,
// then a use case, then a couple of nodes/edges) and hand the whole batch over ONCE, as one wave. After the
// hand-off the page LOCKS: the sent brief must not silently go stale while a coder is working from it.
//
// TWO DELIBERATE NON-INVENTIONS:
//
// 1. "What is staged" is NOT a new counter and NOT a new table. Step 238 already gives every entity instance
//    a `pending` flag (true exactly when it carries a not-yet-developed `currentTask`) — across all ten
//    entity types, through ONE shape. So the wave is simply: every instance with pending:true. Reusing the
//    bundler means a new entity type joins the wave automatically, with zero code here.
//
// 2. "Is the page locked" is NOT a new DB column. The wave IS the bundled Development Step file: locked ⟺ a
//    bundled step for this automation is still waiting in DEVELOPMENT-STEPS/NEW-STEPS/ (materialize-first,
//    the same file queue the whole product already runs on). When the coder finishes and the step moves to
//    COMPLETED-STEPS/, the page unlocks by itself — nothing to reset, nothing that can drift out of sync.

export type WaveState = "idle" | "staging" | "locked";

/** One staged change — an entity instance whose task has not been handed to a coding agent yet. */
export type WaveItem = {
  entityType: EntityType;
  /** '' for automation-wide entities; the cuid for a node / edge / use case. */
  ref: string;
  /** A short human name for the step's task list (the node's name, the case's title, …). */
  label: string;
  /** The task itself, flattened to text — what the coder must actually read. */
  task: string;
};

export type Wave = {
  state: WaveState;
  items: WaveItem[];
  /** The step number the owner was given, while `locked`. */
  step?: number;
  stepName?: string;
};

/** The step-file marker of a wave (also how `locked` is detected). Kept in the machine block by
 *  materializeWaveStep, so a wave step is always recognisable — even across a restart. */
export const WAVE_STEP_PREFIX = "Develop ";

// A wave item's TASK, flattened out of the per-entity TTask shapes (step 238 keeps them deliberately flat —
// 1-3 plain string fields — precisely so a reader never needs entity-specific parsing).
function taskText(t: unknown): string {
  if (!t || typeof t !== "object") return "";
  const o = t as Record<string, unknown>;
  const parts = [o.title, o.summary, o.brief, o.instruction, o.spec]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  return parts.join("\n").trim();
}

function itemLabel(entityType: EntityType, inst: EntityInstance<unknown, unknown>): string {
  const id = (inst.identity ?? {}) as Record<string, unknown>;
  const named = [id.name, id.title, id.slug].find((v): v is string => typeof v === "string" && v.trim().length > 0);
  if (named) return named;
  // Automation-wide entities (dashboard/analytics/…/fork-activation) have no name of their own — the entity
  // type IS the name ("the dashboard requirement").
  return entityType;
}

/** Every staged (pending) change of an automation — the wave's contents. */
export async function stagedItems(automation: string): Promise<WaveItem[]> {
  const slices = await Promise.all(
    ENTITY_TYPES.map((t) => extractEntitySlice(t, automation, false).catch(() => null)),
  );
  const items: WaveItem[] = [];
  for (const slice of slices) {
    if (!slice) continue;
    for (const inst of slice.instances) {
      if (!inst.pending) continue;
      items.push({
        entityType: slice.entityType,
        ref: inst.ref,
        label: itemLabel(slice.entityType, inst),
        task: taskText(inst.currentTask),
      });
    }
  }
  return items;
}

/** The bundled wave step still waiting in the queue for this automation (⟹ the page is locked). */
export async function pendingWaveStep(automation: string): Promise<{ number: number; name: string } | null> {
  const step = (await pendingSteps()).find(
    (s) => s.automation === automation && s.name.startsWith(WAVE_STEP_PREFIX),
  );
  return step ? { number: step.number, name: step.name } : null;
}

/** The page's whole wave state — what the banner, the lock and every tool on the page read. */
export async function waveOf(automation: string): Promise<Wave> {
  const [locked, items] = await Promise.all([pendingWaveStep(automation), stagedItems(automation)]);
  if (locked) return { state: "locked", items, step: locked.number, stepName: locked.name };
  return { state: items.length ? "staging" : "idle", items };
}

/** The wave's AUTO-NAME (owner's choice — no naming UI): "Develop <automation> — dashboard, analytics, 2 nodes". */
export function waveName(automation: string, items: WaveItem[]): string {
  const counts = new Map<EntityType, number>();
  for (const i of items) counts.set(i.entityType, (counts.get(i.entityType) ?? 0) + 1);
  const parts = [...counts.entries()].map(([t, n]) => {
    if (n === 1) return t === "node" || t === "edge" || t === "usecase" ? `1 ${t}` : t;
    return `${n} ${t}s`;
  });
  return `${WAVE_STEP_PREFIX}${automation}${parts.length ? ` — ${parts.join(", ")}` : ""}`;
}
