import { NextRequest, NextResponse } from "next/server";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import AdmZip from "adm-zip";
import { requireAuth } from "@/lib/require-auth";

const APP_DB      = process.env.APP_DB_PATH ?? "/opt/fractera/app/data/app.db";
const MEDIA_DB    = "/opt/fractera/services/data/data/media.db";
const STORAGE_DIR = "/opt/fractera/services/data/storage";

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const zip = new AdmZip();

    if (existsSync(APP_DB))   zip.addLocalFile(APP_DB, "", "app.db");
    if (existsSync(MEDIA_DB)) zip.addLocalFile(MEDIA_DB, "", "media.db");
    if (existsSync(STORAGE_DIR)) {
      for (const f of readdirSync(STORAGE_DIR)) {
        zip.addLocalFile(join(STORAGE_DIR, f), "storage");
      }
    }

    const date = new Date().toISOString().slice(0, 10);
    const filename = `fractera-backup-${date}.zip`;
    const buf = zip.toBuffer();

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buf.length),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
