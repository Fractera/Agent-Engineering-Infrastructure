import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { PROJECT_CATEGORIES } from "@/app/(projects)/projects/_shared/categories";
import { listProjectSlugs } from "@/app/(projects)/projects/_shared/projects-manifest";
import { readAutomationType } from "@/app/(projects)/projects/_shared/automation-type-reader";
import {
  automationReadiness, getGlobalLayout, listEdges, pruneDeadEdges, readGlobalState, writeGlobalState, type Layout,
} from "@/lib/edges";

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
  /** The immutable automation TYPE (step 224 §1.5, extended 234.3) — the canvas badges it, and a "chained"
   *  automation renders as a group container other automations can be dragged into. */
  type: "stream" | "instanced" | "chained";
};

// The workspace state is a FILE now (_data/global-automation.json, block 2 of the file-system refactor):
// no row to create, no default to insert — a missing file simply reads as the default state.
async function globalRow(): Promise<{ status: string; layout: string }> {
  const state = await readGlobalState();
  return { status: state.status, layout: JSON.stringify(state.layout) };
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const projects: GlobalProject[] = [];
  for (const c of PROJECT_CATEGORIES) {
    for (const slug of await listProjectSlugs(c.slug)) {
      const automation = `${c.slug}/${slug}`;
      const r = await automationReadiness(automation);
      const proj = resolveProject(automation);
      const type = proj.ok ? await readAutomationType(proj.projectDir, automation) : "stream";
      projects.push({ automation, category: c.slug, slug, ready: r.ready, nodes: r.nodes, drafts: r.drafts, reason: r.reason, type });
    }
  }

  // Self-healing: a project is deleted by removing its folder (there is no delete route), so links to a
  // vanished project are pruned here — the canvas never shows a dangling edge and no orphan folder is left.
  await pruneDeadEdges(projects.map((p) => p.automation));

  const edges = await listEdges();
  const g = await globalRow();
  // The global automation's state is DERIVED, never stale:
  //   • the owner turned it OFF        -> off  (the projects keep running; only the synchronisation stops)
  //   • any link is still a draft      -> in-development (mirror of the per-project interlock, 224 L6:
  //                                       you cannot synchronise through a link that is not built)
  //   • otherwise                      -> on   (every link is built; nothing blocks the synchronisation)
  const draftEdges = edges.filter((e) => e.draft === 1).length;
  const status = g.status === "off" ? "off" : draftEdges > 0 ? "in-development" : "on";

  // Positions AND group/subflow membership (step 234.3) — one JSON blob, shared reader with edges/route.ts.
  const layout = await getGlobalLayout();

  return NextResponse.json({ projects, edges, status, draftEdges, layout });
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as
    | { status?: string; layout?: Layout }
    | null;
  await globalRow();

  if (body?.status && ["in-development", "on", "off"].includes(body.status)) {
    await writeGlobalState({ status: body.status });
  }
  if (body?.layout) {
    // Light validation (step 234.3): reject self-parenting; everything else (positions, group size) is
    // cosmetic canvas state — trusted, same as before this change.
    for (const [automation, entry] of Object.entries(body.layout)) {
      if (entry.parent === automation) {
        return NextResponse.json({ error: `"${automation}" cannot be its own group` }, { status: 400 });
      }
    }
    await writeGlobalState({ layout: body.layout });
  }
  return NextResponse.json({ ok: true });
}
