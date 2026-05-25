import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { requireAuth } from "@/lib/require-auth";

const AUTH_DB = process.env.APP_DB_PATH ?? "/opt/fractera/app/data/app.db";

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = new Database(AUTH_DB, { readonly: true });
    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all() as { name: string }[];
    db.close();
    return NextResponse.json({ tables: rows.map((r) => r.name) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
