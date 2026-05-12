import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { requireAuth } from "@/lib/require-auth";

const APP_DB = process.env.APP_DB_PATH ?? "/opt/fractera/app/data/app.db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { table } = await params;

  try {
    const db = new Database(APP_DB, { readonly: true });
    const exists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ?"
    ).get(table);
    if (!exists) { db.close(); return NextResponse.json({ error: "Table not found" }, { status: 404 }); }
    const info = db.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[];
    const rows = db.prepare(`SELECT * FROM "${table}" LIMIT 500`).all();
    db.close();
    return NextResponse.json({ columns: info.map((c) => c.name), rows });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
