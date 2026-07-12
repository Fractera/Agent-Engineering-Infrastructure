import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject, listNodes } from "@/lib/nodes";
import { finishQuiz, getQuiz } from "@/lib/quiz";
import { pendingSteps } from "@/lib/dev-steps";

// Finish the Quiz (step 227) — the owner stops designing (or the 10-node cap was reached). The GUARANTEE:
// even when the automation is not fully designed, the owner leaves with something they can TEST and a clear
// statement of where it stands — how many nodes were designed, how many development steps are waiting, and
// how to continue. That report is what the closing toast shows.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const quiz = await getQuiz(proj.automation);
  if (quiz) await finishQuiz(quiz);

  const nodes = await listNodes(proj.automation);
  const drafts = nodes.filter((n) => n.draft === 1).length;
  const steps = (await pendingSteps()).filter((s) => s.automation === proj.automation);

  return NextResponse.json({
    ok: true,
    designed: nodes.length,
    drafts,
    pendingSteps: steps.length,
    // What the owner can do RIGHT NOW, even if the design is unfinished.
    canTest: drafts === 0,
    report:
      drafts === 0
        ? `All ${nodes.length} nodes are built — the automation is out of development and can be tested.`
        : `${nodes.length} nodes designed, ${drafts} still to build (${steps.length} development step${steps.length === 1 ? "" : "s"} waiting). Hand them to a coding agent from the Builder, or continue the design later — the automation stays "In development" until every node is built.`,
  });
}
