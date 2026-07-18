import { NextRequest, NextResponse } from "next/server";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import { authorize, resolveProject, scheduleRebuild } from "@/lib/nodes";
import { regenerateExecutables } from "@/lib/executables";
import { clearCatalogTrack } from "@/lib/automation-catalog";
import { purgeMemoryBySource } from "@/lib/vector-memory";

// DELETE AN AUTOMATION (step 241 E3.2, owner's request) — the tool the product was missing entirely: you
// could create automations but never remove one, so every test and every abandoned idea stayed forever.
//
// It is DESTRUCTIVE AND COMPLETE, on purpose: the automation's whole folder goes (its nodes, its functions,
// its data files — the co-location invariant paying off: delete the folder and the behaviour is gone with
// zero technical debt), and so does every row that belonged to it. Anything left behind would be a ghost —
// exactly the class of bug the executor's gate caught earlier (an index row whose folder no longer existed
// made an automation permanently unrunnable).
//
// SAFETY: the caller must send `confirm` equal to the automation's own slug. A stray click cannot delete a
// project; the UI makes the owner type it (Danger zone → explicit confirmation modal).
export const runtime = "nodejs";

// Every table that stores something keyed by the automation. Two of them are not keyed by `automation` at
// all and need their own clause (below): automation_run_nodes hangs off a run, and quiz turns off a quiz.
const BY_AUTOMATION = [
  "automation_runs",
  "automation_instances",
  "automation_schedule",
  "automation_nodes",
  "automation_entities",
  "automation_use_cases",
  "automation_use_cases_review",
  "automation_quiz_phase",
  "dashboard_rows",
  "entity_transport",
  "entity_history",
  "automation_finance",
  "automation_finance_types",
  "automation_images",
  "automation_geo",
  "automation_calendar_tokens",
];

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string; confirm?: string } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  // The explicit confirmation: the owner types the automation's own slug. Never a bare "are you sure?".
  const confirm = String(body?.confirm ?? "").trim();
  if (confirm !== proj.slug) {
    return NextResponse.json({ error: "confirmation does not match the automation's name", expected: proj.slug }, { status: 400 });
  }

  const automation = proj.automation;

  // 0. the automation's WHOLE vector memory (step 261, upgraded from the step-258 catalog-only delete) — a
  //    deleted automation must leave NO memory behind: its notes, finance rows, output-node results AND its
  //    catalog doc all carry `projects/<automation>` provenance, so one purge-by-source removes them all.
  //    Best-effort: absent LightRAG is a no-op. Then forget the catalog track-id DB row.
  await purgeMemoryBySource(automation);
  await clearCatalogTrack(automation);

  // 1. run-node rows hang off the runs, not off the automation — clear them before their parents.
  await db.prepare(
    `DELETE FROM automation_run_nodes WHERE run_id IN (SELECT id FROM automation_runs WHERE automation = ?)`,
  ).run(automation);

  // 2. quiz turns hang off a quiz row; a quiz row's key is the automation OR a subject key derived from it
  //    ("entity:<automation>:<type>", "usecases:<automation>") — so match the automation as a prefix too.
  await db.prepare(
    `DELETE FROM automation_quiz_turns WHERE quiz_id IN (SELECT id FROM automation_quiz WHERE automation = ? OR automation LIKE ?)`,
  ).run(automation, `%${automation}%`);
  await db.prepare(`DELETE FROM automation_quiz WHERE automation = ? OR automation LIKE ?`).run(automation, `%${automation}%`);

  // 3. every plain automation-keyed table. A table that does not exist on an older database must not abort
  //    the delete — the automation still has to go.
  for (const table of BY_AUTOMATION) {
    try {
      await db.prepare(`DELETE FROM ${table} WHERE automation = ?`).run(automation);
    } catch { /* table absent on this database — nothing of ours is in it */ }
  }

  // 4. links: an edge belongs to NO automation — it sits BETWEEN two. Deleting one endpoint prunes it, so
  //    nothing dangles on the global canvas (the rule the edge standard already states, step 225).
  await db.prepare(
    `DELETE FROM automation_edges WHERE from_automation = ? OR to_automation = ?`,
  ).run(automation, automation);

  // 5. the folder — with it go the nodes, their functions, and every _data file. Zero technical debt.
  await rm(proj.projectDir, { recursive: true, force: true });

  // 5b. a Stream automation's starting pattern (step 243) also writes a per-automation "live" action route
  // OUTSIDE projectsRoot (app/api/projects/<cat>/<slug>/ — a served route, not project content). Absent for
  // every automation that predates 243 or never declared a `live` column; rm with force never errors on a
  // missing path, so this is a no-op for those.
  await rm(join(process.cwd(), "app", "api", "projects", proj.category, proj.slug), { recursive: true, force: true });

  // 6. the generated executables/activations registry must forget it too, or the bundler would still carry
  //    an import of a folder that no longer exists (a build error, and a ghost node in the executor).
  await regenerateExecutables().catch(() => { /* the delete itself already succeeded */ });
  scheduleRebuild();

  return NextResponse.json({ ok: true, deleted: automation, rebuilding: true });
}
