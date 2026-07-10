import { start } from "workflow/api";
import { NextResponse } from "next/server";
import { runProject } from "../_workflow/definition";

// Trigger of the project's durable workflow. Starts the run asynchronously and
// returns its runId immediately — the workflow keeps running in the World after
// this handler returns, journaling itself into project_cron_runs.
//
// Callers: a cron.json http action of THIS project (the substrate runner already
// sends x-agent-identity, so the /api/* auth gate passes), or an agent:
//   curl -X POST http://localhost:3000/api/projects/personal/telegram-notes/run \
//        -H "Content-Type: application/json" -H "X-Agent-Identity: <you>" \
//        --data '{"input":"optional run input"}'
// The response deliberately carries NO resultTitle: the trigger firing must not
// land in the results table — the workflow's own journal row carries the result.

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const input = typeof body.input === "string" ? body.input : undefined;

  const run = await start(runProject, [input]);

  return NextResponse.json({ runId: run.runId });
}
