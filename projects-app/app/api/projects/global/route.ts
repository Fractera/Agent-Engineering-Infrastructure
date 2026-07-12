import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/nodes";
import { PROJECT_CATEGORIES } from "@/app/(projects)/projects/_shared/categories";
import { listProjectSlugs } from "@/app/(projects)/projects/_shared/projects-manifest";
import { automationReadiness, listEdges, pruneDeadEdges } from "@/lib/edges";

// THE GLOBAL CANVAS STATE (step 225) — everything the workspace-level graph needs, in one poll:
//   • every PROJECT as a node, with its readiness (a project still "In development" or inactive is drawn
//     in FULL RED — it cannot be an edge endpoint yet);
//   • every EDGE (the programmable integrations between automations);
//   • the GLOBAL AUTOMATION's own state (in-development | on | off) and the saved canvas layout.
// "Off" does not stop the projects — they keep running exactly as before, only the global synchronisation
// between them stops.
export const runtime = "nodejs";

export type GlobalProject = {
  automation: string; category: string; slug: string;
  ready: boolean; nodes: number; drafts: number; reason?: string;
};

async function globalRow(): Promise<{ status: string; layout: string }> {
  const row = (await db.prepare(`SELECT status, layout FROM global_automation WHERE id = 1`).get()) as
    | { status: string; layout: string }
    | undefined;
  if (row) return row;
  await db.prepare(`INSERT OR IGNORE INTO global_automation (id, status) VALUES (1, 'in-development')`).run();
  return { status: "in-development", layout: "{}" };
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const projects: GlobalProject[] = [];
  for (const c of PROJECT_CATEGORIES) {
    for (const slug of await listProjectSlugs(c.slug)) {
      const automation = `${c.slug}/${slug}`;
      const r = await automationReadiness(automation);
      projects.push({ automation, category: c.slug, slug, ready: r.ready, nodes: r.nodes, drafts: r.drafts, reason: r.reason });
    }
  }

  // Self-healing: a project is deleted by removing its folder (there is no delete route), so links to a
  // vanished project are pruned here — the canvas never shows a dangling edge and no orphan folder is left.
  await pruneDeadEdges(projects.map((p) => p.automation));

  const edges = await listEdges();
  const g = await globalRow();
  // The global automation is "in development" while any edge is still a draft — mirror of the per-project
  // interlock (224 L6): you cannot synchronise through a link that is not built.
  const draftEdges = edges.filter((e) => e.draft === 1).length;
  const status = draftEdges > 0 && g.status !== "off" ? "in-development" : g.status;

  let layout: Record<string, { x: number; y: number }> = {};
  try { layout = JSON.parse(g.layout) as Record<string, { x: number; y: number }>; } catch { /* empty */ }

  return NextResponse.json({ projects, edges, status, draftEdges, layout });
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as
    | { status?: string; layout?: Record<string, { x: number; y: number }> }
    | null;
  await globalRow();

  if (body?.status && ["in-development", "on", "off"].includes(body.status)) {
    await db.prepare(`UPDATE global_automation SET status = ?, updated_at = datetime('now') WHERE id = 1`).run(body.status);
  }
  if (body?.layout) {
    await db.prepare(`UPDATE global_automation SET layout = ?, updated_at = datetime('now') WHERE id = 1`)
      .run(JSON.stringify(body.layout));
  }
  return NextResponse.json({ ok: true });
}
