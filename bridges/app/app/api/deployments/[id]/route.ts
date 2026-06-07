import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { requireAuth } from "@/lib/require-auth";

const APP_DB = process.env.APP_DB_PATH ?? "/opt/fractera/app/data/app.db";

// Update the user's quality rating (1-3 stars) for one deployment row. The
// rating is the only field the user edits — everything else is written once by
// Hermes. Validates result ∈ {1,2,3} so the star modal can't write garbage.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as { result?: unknown };
  const result = Number(body.result);
  if (![1, 2, 3].includes(result)) {
    return NextResponse.json({ error: "result must be 1, 2 or 3" }, { status: 400 });
  }

  try {
    const db = new Database(APP_DB);
    const info = db.prepare("SELECT id FROM deployment_records WHERE id = ?").get(id);
    if (!info) { db.close(); return NextResponse.json({ error: "Not found" }, { status: 404 }); }
    db.prepare("UPDATE deployment_records SET result = ? WHERE id = ?").run(result, id);
    db.close();
    return NextResponse.json({ ok: true, id, result });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
