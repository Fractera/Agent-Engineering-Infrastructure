import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { requireAuth } from "@/lib/require-auth";

const APP_DB = process.env.APP_DB_PATH ?? "/opt/fractera/app/data/app.db";

// Product Loop deployments table — read directly from app.db (same pattern as
// /api/db/tables) but always newest-first. Hermes writes rows via the L2
// deployments MCP server (:3215); this endpoint only reads them for the admin UI.
export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "200"), 1000);

  try {
    const db = new Database(APP_DB, { readonly: true });
    const exists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = 'deployment_records'"
    ).get();
    if (!exists) { db.close(); return NextResponse.json({ rows: [] }); }

    // `step` was added after the table shipped — on an already-running server the
    // column may not exist yet (added lazily on the first MCP write). Only search
    // it when present, so this readonly read never depends on migration ordering.
    const hasStep = (db.prepare("PRAGMA table_info(deployment_records)").all() as Array<{ name: string }>)
      .some((c) => c.name === "step");

    let rows;
    if (search) {
      const like = `%${search}%`;
      const stepClause = hasStep ? " OR step LIKE ?" : "";
      const stmt = db.prepare(
        `SELECT * FROM deployment_records
         WHERE commit_message LIKE ? OR platform LIKE ? OR model LIKE ? OR page_url LIKE ?${stepClause}
         ORDER BY created_at DESC LIMIT ?`
      );
      rows = hasStep
        ? stmt.all(like, like, like, like, like, limit)
        : stmt.all(like, like, like, like, limit);
    } else {
      rows = db.prepare(
        `SELECT * FROM deployment_records ORDER BY created_at DESC LIMIT ?`
      ).all(limit);
    }
    db.close();
    return NextResponse.json({ rows });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
