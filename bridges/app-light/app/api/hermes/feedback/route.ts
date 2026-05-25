import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const FEEDBACK_DIR = "/opt/fractera/app/docs/hermes/feedback-history";
const RAG_INGEST   = "http://localhost:3002/api/rag/ingest";
const HERMES_API   = "http://localhost:9119/api/feedback";

type Verdict = "approved" | "partial" | "rework" | "milestone_done" | "continue";

const VERDICT_LABELS: Record<Verdict, string> = {
  approved:       "✓ Approved",
  partial:        "⚠ Partial",
  rework:         "✗ Rework",
  milestone_done: "★ Milestone done",
  continue:       "→ Continue to next step",
};

function buildMarkdown(taskId: string, verdict: Verdict, comment: string, isMilestone: boolean): string {
  const date = new Date().toISOString().slice(0, 10);
  return [
    `# Hermes feedback: ${taskId}`,
    `**Date:** ${date}`,
    `**Verdict:** ${VERDICT_LABELS[verdict]}`,
    `**Is milestone:** ${isMilestone}`,
    "",
    comment ? `## User comment\n${comment}` : "",
    "",
    "## Hermes self-note",
    "_(to be filled by Hermes after receiving this feedback)_",
  ].filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { task_id, verdict, comment = "", is_milestone = false } = body;

    if (!task_id || !verdict) {
      return NextResponse.json({ error: "task_id and verdict are required" }, { status: 400 });
    }

    const validVerdicts: Verdict[] = ["approved", "partial", "rework", "milestone_done", "continue"];
    if (!validVerdicts.includes(verdict)) {
      return NextResponse.json({ error: `Invalid verdict: ${verdict}` }, { status: 400 });
    }

    const markdown = buildMarkdown(task_id as Verdict, verdict, comment, is_milestone);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `${date}-${task_id.slice(0, 8)}.md`;

    // Write feedback file (server-side only)
    let filePath: string | null = null;
    try {
      if (!fs.existsSync(FEEDBACK_DIR)) fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
      filePath = path.join(FEEDBACK_DIR, filename);
      fs.writeFileSync(filePath, markdown, "utf-8");
    } catch (e) {
      console.warn("[hermes/feedback] could not write file:", e);
    }

    // Ingest into Company Brain
    try {
      await fetch(RAG_INGEST, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: markdown, description: `hermes-feedback | ${task_id} | ${verdict}` }),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      // non-fatal
    }

    // Notify Hermes dashboard (soft — may not be running)
    try {
      await fetch(HERMES_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id, verdict, comment, is_milestone }),
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // non-fatal
    }

    return NextResponse.json({ ok: true, file: filename });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
