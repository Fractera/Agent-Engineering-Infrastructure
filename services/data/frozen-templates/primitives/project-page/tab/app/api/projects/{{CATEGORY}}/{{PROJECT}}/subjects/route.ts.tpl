import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  SUBJECT_COLUMNS,
  ACTIVITY_COLUMNS,
} from "@/app/(projects)/projects/{{CATEGORY}}/{{PROJECT}}/_data/subject-view";

// Subjects + activity endpoint (ontology entity 13, §D, step 195). Default: the cross-automation
// objects THIS automation owns (subjects), searchable by kind/status. ?view=activity: the recent
// inter-automation events that touched them (subject_events). Both read shared substrate tables
// filtered by owner_automation and page in the /records API shape so the universal RecordsTable works.
export const runtime = "nodejs";

const THIS_AUTOMATION = "{{CATEGORY}}/{{PROJECT}}";
const PAGE = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") ?? "").trim();
  const view = searchParams.get("view") === "activity" ? "activity" : "subjects";
  const offset = Math.max(0, Number.parseInt(searchParams.get("offset") ?? "0", 10) || 0);
  try {
    if (view === "activity") {
      const where = search
        ? `WHERE s.owner_automation = ? AND se.event LIKE ?`
        : `WHERE s.owner_automation = ?`;
      const args = search ? [THIS_AUTOMATION, `%${search}%`] : [THIS_AUTOMATION];
      const rows = await db
        .prepare(
          `SELECT se.id AS id, se.subject_id AS subject_id, se.event AS event,
                  se.from_automation AS from_automation, se.created_at AS created_at
             FROM subject_events se JOIN subjects s ON s.id = se.subject_id
             ${where} ORDER BY se.created_at DESC LIMIT ${PAGE + 1} OFFSET ${offset}`,
        )
        .all(...args);
      return NextResponse.json(pageRows(rows, ACTIVITY_COLUMNS));
    }
    const where = search
      ? `WHERE owner_automation = ? AND (kind LIKE ? OR status LIKE ?)`
      : `WHERE owner_automation = ?`;
    const args = search ? [THIS_AUTOMATION, `%${search}%`, `%${search}%`] : [THIS_AUTOMATION];
    const rows = await db
      .prepare(
        `SELECT id, kind, status, owner_automation, updated_at
           FROM subjects ${where} ORDER BY updated_at DESC LIMIT ${PAGE + 1} OFFSET ${offset}`,
      )
      .all(...args);
    return NextResponse.json(pageRows(rows, SUBJECT_COLUMNS));
  } catch {
    return NextResponse.json({ rows: [], hasMore: false });
  }
}

function pageRows(rows: unknown[], cols: typeof SUBJECT_COLUMNS) {
  const hasMore = rows.length > PAGE;
  const page = rows.slice(0, PAGE).map((row) => {
    const rec = row as Record<string, unknown>;
    const values: Record<string, unknown> = {};
    for (const c of cols) values[c.id] = rec[c.source];
    return { id: String(rec.id), values };
  });
  return { rows: page, hasMore };
}
