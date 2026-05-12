import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { requireAuth } from "@/lib/require-auth";

const APP_DB = process.env.APP_DB_PATH ?? "/opt/fractera/app/data/app.db";

async function tableExists(db: InstanceType<typeof Database>, table: string): Promise<boolean> {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(table);
  return !!row;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { table, id } = await params;
  const body = await req.json() as { column: string; value: unknown };
  const { column, value } = body;

  try {
    const db = new Database(APP_DB);
    if (!await tableExists(db, table)) { db.close(); return NextResponse.json({ error: "Table not found" }, { status: 404 }); }
    const info = db.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[];
    const validCols = new Set(info.map((c) => c.name));
    if (!validCols.has(column)) {
      db.close();
      return NextResponse.json({ error: "Invalid column" }, { status: 400 });
    }
    db.prepare(`UPDATE "${table}" SET "${column}" = ? WHERE id = ?`).run(value, id);
    db.close();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> }
) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { table, id } = await params;

  try {
    const db = new Database(APP_DB);
    if (!await tableExists(db, table)) { db.close(); return NextResponse.json({ error: "Table not found" }, { status: 404 }); }
    db.prepare(`DELETE FROM "${table}" WHERE id = ?`).run(id);
    db.close();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
