import { NextRequest, NextResponse } from "next/server";
import { existsSync, writeFileSync, mkdtempSync, rmSync } from "fs";
import { join } from "path";
import AdmZip from "adm-zip";
import Database from "better-sqlite3";
import { requireAuth } from "@/lib/require-auth";

const APP_DB      = process.env.APP_DB_PATH ?? "/opt/fractera/app/data/app.db";
const MEDIA_DB    = "/opt/fractera/services/data/data/media.db";
const STORAGE_DIR = "/opt/fractera/services/data/storage";

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let tmpDir = "";
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = new AdmZip(buffer);

    tmpDir = mkdtempSync("/tmp/fractera-restore-");

    let dbRows    = 0;
    let mediaRows = 0;
    let mediaFiles = 0;

    // Merge app.db
    const appDbEntry = zip.getEntry("app.db");
    if (appDbEntry && existsSync(APP_DB)) {
      const tmpPath = join(tmpDir, "app.db");
      writeFileSync(tmpPath, appDbEntry.getData());
      const src  = new Database(tmpPath, { readonly: true });
      const live = new Database(APP_DB);
      const tables = (src
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all() as { name: string }[])
        .map((r) => r.name);
      for (const table of tables) {
        const rows = src.prepare(`SELECT * FROM "${table}"`).all() as Record<string, unknown>[];
        if (!rows.length) continue;
        const cols = Object.keys(rows[0]);
        const stmt = live.prepare(
          `INSERT OR IGNORE INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`
        );
        const insert = live.transaction((rs: Record<string, unknown>[]) => {
          for (const row of rs) stmt.run(Object.values(row));
        });
        try { insert(rows); dbRows += rows.length; } catch {}
      }
      src.close();
      live.close();
    }

    // Merge media.db
    const mediaDbEntry = zip.getEntry("media.db");
    if (mediaDbEntry && existsSync(MEDIA_DB)) {
      const tmpPath = join(tmpDir, "media.db");
      writeFileSync(tmpPath, mediaDbEntry.getData());
      const src  = new Database(tmpPath, { readonly: true });
      const live = new Database(MEDIA_DB);
      const rows = src.prepare("SELECT * FROM media").all() as Record<string, unknown>[];
      if (rows.length) {
        const cols = Object.keys(rows[0]);
        const stmt = live.prepare(
          `INSERT OR IGNORE INTO media (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`
        );
        const insert = live.transaction((rs: Record<string, unknown>[]) => {
          for (const row of rs) stmt.run(Object.values(row));
        });
        try { insert(rows); mediaRows += rows.length; } catch {}
      }
      src.close();
      live.close();
    }

    // Merge storage files (only new)
    const storageEntries = zip.getEntries().filter((e) => e.entryName.startsWith("storage/") && !e.isDirectory);
    for (const entry of storageEntries) {
      const destPath = join(STORAGE_DIR, entry.name);
      if (!existsSync(destPath)) {
        writeFileSync(destPath, entry.getData());
        mediaFiles++;
      }
    }

    return NextResponse.json({ ok: true, stats: { dbRows, mediaRows, mediaFiles } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  } finally {
    if (tmpDir && existsSync(tmpDir)) {
      try { rmSync(tmpDir, { recursive: true }); } catch {}
    }
  }
}
