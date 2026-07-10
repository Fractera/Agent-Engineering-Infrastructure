import { db } from "@/lib/db";

export const CATEGORY = "personal";
export const PROJECT = "telegram-notes";
export const PROJECT_TITLE = "Telegram Notes";

const JOB_KEY = `${CATEGORY}/${PROJECT}#workflow`;

// Run journal of the durable workflow — the SAME project_cron_runs table the
// queue/results tables of this page read (and the substrate cron runner writes
// via the :3300 data service). Slot code writes through the canonical db layer;
// both paths land in the shared app DB, so a workflow run shows up on the page
// exactly like a cron run. `created_by` tells the two writers apart.

export function journalRunStart(runId: string, input?: string): void {
  void input;
  db.prepare(
    `INSERT INTO project_cron_runs (id, job_key, category, project, process, status, created_by)
     VALUES (?, ?, ?, ?, ?, 'in-progress', 'wdk')`,
  ).run(runId, JOB_KEY, CATEGORY, PROJECT, PROJECT_TITLE);
}

export function journalRunFinish(
  runId: string,
  result: { ok: boolean; resultTitle?: string; resultUrl?: string; error?: string },
): void {
  db.prepare(
    `UPDATE project_cron_runs
        SET status = ?, finished_at = datetime('now'),
            result_title = ?, result_url = ?, error = ?
      WHERE id = ?`,
  ).run(
    result.ok ? "completed" : "failed",
    result.resultTitle ?? null,
    result.resultUrl ?? null,
    result.error ?? null,
    runId,
  );
}
