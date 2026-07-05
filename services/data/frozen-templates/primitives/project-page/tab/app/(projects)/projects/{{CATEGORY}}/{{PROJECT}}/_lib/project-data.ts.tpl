import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import type { CronJob, ProcessRun, ProjectResult } from "./types";

const CATEGORY = "{{CATEGORY}}";
const PROJECT = "{{PROJECT}}";
const LIMIT = 50;

// Providers for the tables of the project page. Run rows are written by the
// substrate cron runner (fractera-cron) and the durable workflow into the
// shared app DB; the scheduled-runs queue is read from the co-located
// cron.json (see README, Finishing).
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

export async function getCronJobs(): Promise<CronJob[]> {
  try {
    const raw = await readFile(
      join(
        process.cwd(),
        "app",
        "(projects)",
        "projects",
        CATEGORY,
        PROJECT,
        "cron.json",
      ),
      "utf8",
    );
    const jobs = JSON.parse(raw)?.jobs;
    if (!Array.isArray(jobs)) {
      return [];
    }
    return jobs.map((j) => ({
      id: String(j?.id ?? ""),
      title: String(j?.title ?? j?.id ?? ""),
      schedule: String(j?.schedule ?? ""),
      enabled: j?.enabled !== false,
    }));
  } catch {
    return []; // no cron.json yet — the project declares no scheduled runs
  }
}
