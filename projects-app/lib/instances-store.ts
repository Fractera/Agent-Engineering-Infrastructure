import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { allGraphAutomations } from "@/lib/graph-store";
import { projectsRoot, resolveProject } from "@/lib/nodes";
import { appendRecord, compactIfNeeded, foldJournal, type JournalRecord } from "@/lib/jsonl-store";

// THE FORK STORE (block 4c, owner 2026-07-20) — what used to be automation_instances, plus the Gantt plan
// that used to be automation_schedule.
//
// A FORK is one parameterised run of an "instanced" automation: the Master is the template, each instance
// carries its own parameters and per-node overrides. Forks are created one at a time by the owner and edited
// rarely, but they are read on every timeline poll — so the same append-only journal as the runs, in the
// automation's own folder: `_data/runtime/instances.jsonl`.
//
// THE PLAN (`_data/runtime/schedule.json`) is different in kind and stored differently: it is RECOMPUTED
// WHOLE on every tick (the old code deleted the automation's rows and re-upserted them), so a single JSON
// file written atomically fits it exactly — a journal would only accumulate rewrites of the same thing.
// Worth stating plainly: nothing reads this plan back today. The timeline renders the array it has just
// computed in memory, and the table was pure write-behind. Keeping it as a file at least makes the last
// computed plan visible in the automation's folder instead of invisible in a table nobody queried.

export type InstanceRow = {
  id: string; automation: string; title: string; specialization: string;
  overrides: string; status: string; created_at: string;
};

function journalPath(automation: string): string | null {
  const proj = resolveProject(automation);
  return proj.ok ? join(proj.projectDir, "_data", "runtime", "instances.jsonl") : null;
}

function schedulePath(automation: string): string | null {
  const proj = resolveProject(automation);
  return proj.ok ? join(proj.projectDir, "_data", "runtime", "schedule.json") : null;
}

async function all(automation: string): Promise<InstanceRow[]> {
  const file = journalPath(automation);
  if (!file) return [];
  return ([...(await foldJournal(file)).values()].filter((r) => r.__kind === "instance") as unknown as InstanceRow[])
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}

/** Every fork of one automation, oldest first (the queue order the timeline runs in). */
export async function listInstances(automation: string): Promise<InstanceRow[]> {
  return all(automation);
}

export async function hasInstances(automation: string): Promise<boolean> {
  return (await all(automation)).length > 0;
}

export async function createInstance(
  automation: string,
  inst: { id: string; title: string; specialization: string; overrides: string },
): Promise<void> {
  const file = journalPath(automation);
  if (!file) return;
  await appendRecord(file, {
    id: inst.id, __kind: "instance",
    automation, title: inst.title, specialization: inst.specialization,
    overrides: inst.overrides, status: "new", created_at: new Date().toISOString(),
  });
  void compactIfNeeded(file);
}

/** A fork is addressed by its id alone (the override route never receives the automation), so its owner is
 *  found by scanning — the same trade-off as a dashboard row, and paid by one route. */
async function ownerOf(instanceId: string): Promise<{ automation: string; row: InstanceRow } | null> {
  for (const automation of await allGraphAutomations(projectsRoot())) {
    const row = (await all(automation)).find((r) => r.id === instanceId);
    if (row) return { automation, row };
  }
  return null;
}

export async function instanceById(instanceId: string): Promise<InstanceRow | undefined> {
  return (await ownerOf(instanceId))?.row;
}

export async function setInstanceOverrides(instanceId: string, overrides: string): Promise<boolean> {
  const found = await ownerOf(instanceId);
  if (!found) return false;
  const file = journalPath(found.automation);
  if (!file) return false;
  await appendRecord(file, { id: instanceId, __kind: "instance", overrides });
  void compactIfNeeded(file);
  return true;
}

export async function setInstanceStatus(instanceId: string, status: string): Promise<boolean> {
  const found = await ownerOf(instanceId);
  if (!found) return false;
  const file = journalPath(found.automation);
  if (!file) return false;
  await appendRecord(file, { id: instanceId, __kind: "instance", status });
  return true;
}

/** Every automation that has at least one fork — replaces SELECT DISTINCT automation FROM …instances. */
export async function automationsWithInstances(): Promise<string[]> {
  const out: string[] = [];
  for (const automation of await allGraphAutomations(projectsRoot())) {
    if (await hasInstances(automation)) out.push(automation);
  }
  return out;
}

// ─── the computed plan ───────────────────────────────────────────────────────

export type PlanRow = {
  instance_id: string; ord: number; planned_start: string; planned_duration_ms: number;
  actual_start: string | null; actual_end: string | null; status: string;
};

export async function saveSchedule(automation: string, rows: PlanRow[]): Promise<void> {
  const p = schedulePath(automation);
  if (!p) return;
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
  await mkdir(dirname(p), { recursive: true });
  await writeFile(tmp, `${JSON.stringify({ automation, updatedAt: new Date().toISOString(), rows }, null, 2)}\n`, "utf8");
  await rename(tmp, p);
}

export async function clearSchedule(automation: string): Promise<void> {
  await saveSchedule(automation, []);
}

/** Drop every fork of this automation (the timeline's Reset clears the plan; this clears the queue). */
export async function clearInstances(automation: string): Promise<void> {
  const file = journalPath(automation);
  if (!file) return;
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, "", "utf8");
}

export type { JournalRecord };
