import { db } from "@/lib/db";
import { SUBJECT_COLUMNS, ACTIVITY_COLUMNS } from "../_data/subject-view";
import type { RecordRow } from "./types";

// Providers for the Subjects table + activity log (ontology entity 13, §D, step 195). They read the
// SUBSTRATE subjects / subject_events tables (shared, app-wide) filtered to THIS automation — the
// subjects it currently owns, and the events it published/received. Server-rendered first page (works
// with JS off); the /subjects API adds search + pagination + one subject's full history.

const THIS_AUTOMATION = "{{CATEGORY}}/{{PROJECT}}";
const LIMIT = 20;

function toRow(cols: typeof SUBJECT_COLUMNS, rec: Record<string, unknown>): RecordRow {
  const values: Record<string, unknown> = {};
  for (const c of cols) values[c.id] = rec[c.source];
  return { id: String(rec.id ?? ""), values };
}

// Subjects this automation currently owns (owner_automation = this project).
export async function getSubjects(): Promise<RecordRow[]> {
  try {
    const rows = await db
      .prepare(
        `SELECT id, kind, status, owner_automation, updated_at
           FROM subjects WHERE owner_automation = ? ORDER BY updated_at DESC LIMIT ${LIMIT}`,
      )
      .all(THIS_AUTOMATION);
    return rows.map((r) => toRow(SUBJECT_COLUMNS, r as Record<string, unknown>));
  } catch {
    return []; // table not created yet — no subjects
  }
}

// The recent inter-automation activity that touched this automation's subjects.
export async function getActivity(): Promise<RecordRow[]> {
  try {
    const rows = await db
      .prepare(
        `SELECT se.id AS id, se.subject_id AS subject_id, se.event AS event,
                se.from_automation AS from_automation, se.created_at AS created_at
           FROM subject_events se
           JOIN subjects s ON s.id = se.subject_id
          WHERE s.owner_automation = ?
          ORDER BY se.created_at DESC LIMIT ${LIMIT}`,
      )
      .all(THIS_AUTOMATION);
    return rows.map((r) => toRow(ACTIVITY_COLUMNS, r as Record<string, unknown>));
  } catch {
    return [];
  }
}
