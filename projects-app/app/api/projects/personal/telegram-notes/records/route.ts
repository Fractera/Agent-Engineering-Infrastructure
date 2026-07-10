import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  PROJECT_COLUMNS,
  RECORD_TABLE,
} from "@/app/(projects)/projects/personal/telegram-notes/_data/columns";

// Generic list endpoint of the universal records table (ontology entity 12 Record). Projects
// the config-declared columns from RECORD_TABLE with server-side search (over text/longtext
// columns) and offset pagination. RECORD_TABLE / column sources are engine-generated and
// validated by the ontology gate; re-checked here so nothing but an identifier reaches SQL.
export const runtime = "nodejs";

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const PAGE = 20;

export async function GET(req: NextRequest) {
  if (!RECORD_TABLE || !IDENT.test(RECORD_TABLE)) {
    return NextResponse.json({ rows: [], hasMore: false });
  }
  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") ?? "").trim();
  const offset = Math.max(0, Number.parseInt(searchParams.get("offset") ?? "0", 10) || 0);

  // image-type columns (step 207.18) are NOT plain table columns — they resolve through the
  // record_images link table (rule R6). Emit a correlated scalar subquery aliased to the declared
  // source; the alias passes the same IDENT gate as real columns.
  const imageSources = new Set(
    PROJECT_COLUMNS.filter((c) => c.type === "image" && IDENT.test(c.source)).map((c) => c.source),
  );
  const sources = Array.from(
    new Set(PROJECT_COLUMNS.map((c) => c.source).filter((s) => IDENT.test(s) && !imageSources.has(s))),
  );
  const imageSelects = [...imageSources].map(
    (alias) =>
      `(SELECT i.media_url FROM record_images ri JOIN automation_images i ON i.id = ri.image_id ` +
      `WHERE ri.record_kind = 'note' AND ri.record_id = ${RECORD_TABLE}.id ORDER BY ri.created_at ASC LIMIT 1) AS ${alias}`,
  );
  const cols = ["id", ...sources.filter((s) => s !== "id"), ...imageSelects];
  const textCols = PROJECT_COLUMNS.filter(
    (c) => (c.type === "text" || c.type === "longtext") && IDENT.test(c.source),
  ).map((c) => c.source);

  const where =
    search && textCols.length
      ? `WHERE (${textCols.map((s) => `${s} LIKE ?`).join(" OR ")})`
      : "";
  const args = search && textCols.length ? textCols.map(() => `%${search}%`) : [];

  try {
    const rows = await db
      .prepare(
        `SELECT ${cols.join(", ")} FROM ${RECORD_TABLE} ${where} ORDER BY id DESC LIMIT ${PAGE + 1} OFFSET ${offset}`,
      )
      .all(...args);
    const hasMore = rows.length > PAGE;
    const page = rows.slice(0, PAGE).map((row) => {
      const rec = row as Record<string, unknown>;
      const values: Record<string, unknown> = {};
      for (const c of PROJECT_COLUMNS) {
        values[c.id] = rec[c.source];
      }
      return { id: String(rec.id), values };
    });
    return NextResponse.json({ rows: page, hasMore });
  } catch {
    return NextResponse.json({ rows: [], hasMore: false });
  }
}
