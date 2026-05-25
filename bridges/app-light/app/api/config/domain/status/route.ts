import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { requireAuth } from "@/lib/require-auth";

const APP_DB = process.env.APP_DB_PATH ?? "/opt/fractera/app/data/app.db";

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = new Database(APP_DB, { readonly: true });
    const row = db.prepare("SELECT domain_status, domain_error FROM site_settings WHERE id = 1").get() as Record<string, unknown> | undefined;
    db.close();
    return NextResponse.json({
      domain_status: row?.domain_status ?? "idle",
      domain_error:  row?.domain_error ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
