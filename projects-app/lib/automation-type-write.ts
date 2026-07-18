import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { scheduleRebuild, type ResolvedProject } from "@/lib/nodes";

// FORCED AUTOMATION-TYPE CHANGE (step 253 — the "wrong type" correction, owner's variant «а», 2026-07-18).
//
// An automation's type is chosen once at creation and is normally IMMUTABLE (automation-type.ts): the whole
// runtime logic — above all whether a run forks — grows out of it, and there is no casual "switch type"
// button for the owner. But a real failure mode exists: the owner picks Stream, then writes a founding
// instruction that plainly describes per-run forks (Instanced) or a link in a chain (Chained). The develop
// agent, reading the spec against the declared type, must be able to CORRECT that — the recommended path
// (variant «а») is to forcibly rewrite the type in place rather than force the owner to delete and recreate.
//
// This is a controlled, agent-driven exception, NOT an owner free-for-all. It is safe because the frozen
// skeleton is the SAME file set for all three types (create/route.ts, frozen-project-starter.ts) — only the
// stored token differs. The four runtime readers (executor, global-canvas route, activation route,
// groups-manifest) read this token LIVE from the file via readAutomationType(), so they pick up the change
// immediately with no rebuild. The page badge colour and the chained→group-container rendering import
// AUTOMATION_TYPE statically (baked at build), so we schedule the SAME flock'd rebuild the create/category
// routes use — that is what makes the change fully live, not just runtime-live.

export type AutomationType = "stream" | "instanced" | "chained";

const TYPE_TOKEN = /(AUTOMATION_TYPE\s*:\s*AutomationType\s*=\s*["'])(stream|instanced|chained)(["'])/;

export type SetTypeResult =
  | { ok: true; from: AutomationType; to: AutomationType; changed: boolean }
  | { ok: false; error: string };

/** Rewrite `_data/automation.ts`'s AUTOMATION_TYPE token in place and schedule a rebuild so the page render
 *  (badge, group container) catches up. Idempotent: setting the type it already is returns changed:false and
 *  schedules nothing. The runtime readers see the new value the moment the file is written. */
export async function setAutomationType(proj: ResolvedProject, to: AutomationType): Promise<SetTypeResult> {
  if (to !== "stream" && to !== "instanced" && to !== "chained") {
    return { ok: false, error: `type must be one of: stream, instanced, chained (got "${to}")` };
  }
  const file = join(proj.projectDir, "_data", "automation.ts");
  let src: string;
  try {
    src = await readFile(file, "utf8");
  } catch {
    return { ok: false, error: "_data/automation.ts not found — cannot change the type" };
  }
  const m = src.match(TYPE_TOKEN);
  if (!m) return { ok: false, error: "AUTOMATION_TYPE token not found in _data/automation.ts — cannot change the type safely" };
  const from = m[2] as AutomationType;
  if (from === to) return { ok: true, from, to, changed: false };
  await writeFile(file, src.replace(TYPE_TOKEN, `$1${to}$3`), "utf8");
  // The same locked (flock at /tmp/projects-build.lock) rebuild the create/category routes use — detached,
  // it does not block the develop run; the runtime already reflects the new type via readAutomationType().
  scheduleRebuild();
  return { ok: true, from, to, changed: true };
}
