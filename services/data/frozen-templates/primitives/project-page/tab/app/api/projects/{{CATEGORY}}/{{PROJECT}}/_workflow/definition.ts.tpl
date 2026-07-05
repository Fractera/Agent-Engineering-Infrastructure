import { PROJECT_TITLE, journalRunStart, journalRunFinish } from "./journal";

// The project's durable workflow (Workflow DevKit). This file is the EXECUTABLE
// mirror of the process diagram in the project page's _data/flow.ts
// (app/(projects)/projects/{{CATEGORY}}/{{PROJECT}}/): the steps below correspond
// to the diagram nodes (work -> store -> publish; the trigger node is the run
// route / cron). Finishing the workflow for the real project = editing THESE
// steps — the same coding-agent handoff as the diagram data, never a template
// change. It lives HERE (under app/api/, next to its run route) and not in the
// page folder: WDK derives the workflow name from the file path and forbids
// parentheses, so a route group like (projects) would make the name invalid.
//
// "use workflow" makes the function durable: its state is checkpointed by the
// active World (world-local on a Fractera VPS), so a run survives a process
// restart and resumes mid-flight. Each "use step" is an independently retried,
// checkpointed unit.

export type RunArtifact = {
  title: string;
  url: string;
};

export async function runProject(input?: string) {
  "use workflow";

  const journalId = await openRun(input);
  try {
    const artifact = await work(input);
    await store(artifact);
    const published = await publish(artifact);
    await closeRun(journalId, {
      ok: true,
      resultTitle: artifact.title,
      resultUrl: published.url,
    });
    return { journalId, status: "completed", resultTitle: artifact.title };
  } catch (e) {
    await closeRun(journalId, {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}

// Journal steps — write the run into project_cron_runs, the same table the
// queue/results tables of the project page read. Keep them as steps: the id is
// checkpointed, so a replay never double-inserts.

async function openRun(input?: string) {
  "use step";

  const id = crypto.randomUUID();
  journalRunStart(id, input);
  return id;
}

async function closeRun(
  id: string,
  result: { ok: boolean; resultTitle?: string; resultUrl?: string; error?: string },
) {
  "use step";

  journalRunFinish(id, result);
}

// ── Diagram-mirror steps (coding-agent handoff: replace the placeholder bodies) ──

async function work(input?: string): Promise<RunArtifact> {
  "use step";

  // TODO (diagram node "work"): the main work of the project — turn the trigger
  // input into the project's artifact.
  return { title: `Run of ${PROJECT_TITLE} (placeholder)`, url: "" };
}

async function store(artifact: RunArtifact): Promise<void> {
  "use step";

  // TODO (diagram node "store"): persist the outcome beyond the journal when the
  // project needs it — own tables via "@/lib/db" (declare them in SCHEMA) and/or
  // vector memory via /api/rag/ingest. The run row itself is already journaled.
  void artifact;
}

async function publish(artifact: RunArtifact): Promise<{ url: string }> {
  "use step";

  // TODO (diagram node "publish"): deliver the artifact to its destination (a
  // published page, a sent message, an exported file) and return its link — it
  // becomes the results-table row of the run.
  return { url: artifact.url };
}
