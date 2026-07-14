import { NextRequest, NextResponse } from "next/server";
import { authorize, listNodes } from "@/lib/nodes";
import { finishQuiz, getQuizFor, resolveQuizTarget } from "@/lib/quiz";
import { pendingSteps } from "@/lib/dev-steps";
import { edgeByCuid, readEdgeFiles } from "@/lib/edges";

// Finish the Quiz (step 227; both subjects since 225 G4) — the owner stops designing (or the 10-node cap was
// reached). THE GUARANTEE: even when the subject is not fully designed, the owner leaves with something they
// can TEST and a clear statement of where it stands — how many nodes were designed, how many development
// steps are waiting, and how to continue. That report is what the closing toast shows.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as
    | { automation?: string; edge?: string; useCase?: string; cases?: boolean; entity?: string }
    | null;
  const t = await resolveQuizTarget({
    automation: body?.automation, edge: body?.edge, useCase: body?.useCase, cases: body?.cases, entity: body?.entity,
  });
  if (!t.ok) return NextResponse.json({ error: t.error }, { status: 400 });

  // Bind the union to a local const: TypeScript drops the narrowing of t.target across an await.
  const target = t.target;
  const quiz = await getQuizFor(target);
  if (quiz) await finishQuiz(quiz);

  // An EDGE session: the owner leaves with the link's brief written (or not) — say exactly which.
  if (target.kind === "edge") {
    const edge = await edgeByCuid(target.cuid);
    const spec = (await readEdgeFiles(target.cuid)).spec.trim();
    const built = edge ? edge.draft === 0 : false;
    return NextResponse.json({
      ok: true,
      subject: "edge",
      canTest: built,
      report: built
        ? "The link is built — the two automations synchronise through it."
        : spec
          ? "The link's brief is written. Press \"Start development\" in the link panel (or let the coding agent drain the queue) to build it."
          : "The link is still empty — reopen the Quiz (or write the brief by hand in the link panel) before starting its development.",
    });
  }

  const nodes = await listNodes(target.automation);
  const drafts = nodes.filter((n) => n.draft === 1).length;
  const steps = (await pendingSteps()).filter((s) => s.automation === target.automation);

  return NextResponse.json({
    ok: true,
    subject: "project",
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
