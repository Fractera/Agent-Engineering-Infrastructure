import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import { PROJECT_COLUMNS, RECORD_TABLE } from "../_data/columns";
import type { CronJob, Hook, ProcessRun, ProjectResult, RecordRow } from "./types";

// SQLite identifier guard — RECORD_TABLE / column sources are engine-generated and validated
// by the ontology gate, but re-checked here so a hand-edited config can never inject SQL.
const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

// The columns' distinct source fields, always including id — the projection getRecords selects.
function recordSources(): string[] {
  const sources = Array.from(
    new Set(PROJECT_COLUMNS.map((c) => c.source).filter((s) => IDENT.test(s))),
  );
  return ["id", ...sources.filter((s) => s !== "id")];
}

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

// Hooks registered for this project (step 187): rows of the GLOBAL project_hooks
// table filtered to this category/project. The server-rendered table shows what
// spoken phrases already drive this automation; the client panel adds/removes them.
export async function getHooks(): Promise<Hook[]> {
  try {
    const rows = await db
      .prepare(
        `SELECT id, phrase, action, lang, description
           FROM project_hooks
          WHERE category = ? AND project = ?
          ORDER BY created_at`,
      )
      .all(CATEGORY, PROJECT);
    return rows.map((r) => ({
      id: String(r.id),
      phrase: String(r.phrase),
      action: r.action as Hook["action"],
      lang: String(r.lang),
      description: String(r.description ?? ""),
    }));
  } catch {
    return []; // table not created yet — no hooks
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

// Rows of the UNIVERSAL records table (ontology entity 12 Record). The columns are
// config-driven (_data/columns.ts); this provider projects each column's `source` from the
// declared RECORD_TABLE into a values map keyed by column id. RECORD_TABLE === "" (the starter
// default) falls back to the generic completed-runs results. Server-rendered first page
// (works with JS off); the /records API serves search + pagination + detail + delete.
export async function getRecords(): Promise<RecordRow[]> {
  if (!RECORD_TABLE) {
    const results = await getResults();
    return results.map((r) => ({
      id: r.id,
      values: {
        title: r.title,
        artifactUrl: r.artifactUrl,
        producedAt: r.producedAt,
      },
    }));
  }
  if (!IDENT.test(RECORD_TABLE)) {
    return []; // config guard — never query a non-identifier table name
  }
  try {
    const cols = recordSources();
    const rows = await db
      .prepare(
        `SELECT ${cols.join(", ")} FROM ${RECORD_TABLE} ORDER BY id DESC LIMIT ${LIMIT}`,
      )
      .all();
    return rows.map((row) => {
      const rec = row as Record<string, unknown>;
      const values: Record<string, unknown> = {};
      for (const c of PROJECT_COLUMNS) {
        values[c.id] = rec[c.source];
      }
      return { id: String(rec.id), values };
    });
  } catch {
    return []; // table not created yet (no run has written a record) — empty
  }
}
