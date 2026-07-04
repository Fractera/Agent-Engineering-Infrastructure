import { db } from "@/lib/db";
import type { ProcessRun, ProjectResult } from "./types";

const CATEGORY = "{{CATEGORY}}";
const PROJECT = "{{PROJECT}}";
const LIMIT = 50;

// Providers for the two tables of the project page. Rows are written by the
// substrate cron runner (fractera-cron) into the shared app DB; declaring jobs
// for THIS project = a cron.json next to this page (see README, Finishing).
export async function getProcessQueue(): Promise<ProcessRun[]> {
  try {
    const rows = await db
      .prepare(
        `SELECT id, process, status, started_at, finished_at
           FROM project_cron_runs
          WHERE category = ? AND project = ?
          ORDER BY started_at DESC
          LIMIT ${LIMIT}`,
      )
      .all(CATEGORY, PROJECT);
    return rows.map((r) => ({
      id: String(r.id),
      process: String(r.process),
      status: r.status as ProcessRun["status"],
      startedAt: String(r.started_at),
      finishedAt: r.finished_at === null ? null : String(r.finished_at),
    }));
  } catch {
    return []; // table not created yet (runner has not ticked) — empty queue
  }
}

export async function getResults(): Promise<ProjectResult[]> {
  try {
    const rows = await db
      .prepare(
        `SELECT id, result_title, result_url, finished_at
           FROM project_cron_runs
          WHERE category = ? AND project = ?
            AND status = 'completed' AND result_title IS NOT NULL
          ORDER BY finished_at DESC
          LIMIT ${LIMIT}`,
      )
      .all(CATEGORY, PROJECT);
    return rows.map((r) => ({
      id: String(r.id),
      title: String(r.result_title),
      artifactUrl: r.result_url === null ? "" : String(r.result_url),
      producedAt: String(r.finished_at),
    }));
  } catch {
    return [];
  }
}
