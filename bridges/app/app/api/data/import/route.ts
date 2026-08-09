import { NextRequest, NextResponse } from "next/server";
import { hardenSecretFile } from "@/lib/env-file";
import { existsSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";
import AdmZip from "adm-zip";
import Database from "better-sqlite3";
import { requireAuth } from "@/lib/require-auth";

const APP_DB = process.env.APP_DB_PATH ?? "/opt/fractera/app/data/app.db";
const MEDIA_DB = "/opt/fractera/services/data/data/media.db";
const STORAGE_DIR = "/opt/fractera/services/data/storage";
const KNOWLEDGE_DIR = "/opt/fractera/services/rag/storage";
const APP_DIR = process.env.APP_DIR ?? "/opt/fractera/app";
const CHANNELS_CONFIG = "/opt/fractera/services/channels/config.json";

// Restoring, in two steps. (step 500) The old version had one: pick a file and it
// silently overwrote whatever it recognised. Now `?inspect=1` reads the archive
// and reports what is inside WITHOUT writing anything, so the dialog can say what
// is about to be replaced before the owner agrees to it.
//
// Databases MERGE (rows are inserted, existing ones win). Everything else is a
// REPLACE, because merging a knowledge graph or two competing settings files has
// no meaning — one of them has to be the truth.

type PartId = "db" | "files" | "knowledge" | "config" | "channels" | "env";

// Minimal shape of a zip entry. Spelled out rather than imported so the file
// compiles whether or not the archive library ships its own types.
type ZipEntry = { entryName: string; isDirectory: boolean; getData(): Buffer };

function detect(zip: AdmZip): { parts: PartId[]; createdAt: string | null } {
  const names = (zip.getEntries() as ZipEntry[]).map((e) => e.entryName);
  const has = (p: string) => names.some((n: string) => n === p || n.startsWith(p));
  const parts: PartId[] = [];
  if (has("app.db")) parts.push("db");
  if (has("media.db") || has("storage/")) parts.push("files");
  if (has("knowledge/")) parts.push("knowledge");
  if (has("APP-CONFIG/") || has("PLATFORM-CONFIG/")) parts.push("config");
  if (has("channels-config.json")) parts.push("channels");
  if (has("env.local")) parts.push("env");

  let createdAt: string | null = null;
  const meta = zip.getEntry("fractera-backup.json");
  if (meta) {
    try { createdAt = JSON.parse(meta.getData().toString("utf8")).createdAt ?? null; } catch { /* older archives have no note */ }
  }
  return { parts, createdAt };
}

function mergeSqlite(entryData: Buffer, livePath: string, tmpDir: string, name: string): number {
  if (!existsSync(livePath)) return 0;
  const tmpPath = join(tmpDir, name);
  writeFileSync(tmpPath, entryData);
  const src = new Database(tmpPath, { readonly: true });
  const live = new Database(livePath);
  let inserted = 0;
  const tables = (src
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string }[])
    .map((r) => r.name)
    // The vector index is derived data rebuilt at startup; copying it across
    // machines would restore rows pointing at nothing.
    .filter((n) => n !== "vectors_ann");
  for (const table of tables) {
    const rows = src.prepare(`SELECT * FROM "${table}"`).all() as Record<string, unknown>[];
    if (!rows.length) continue;
    const cols = Object.keys(rows[0]);
    const stmt = live.prepare(
      `INSERT OR IGNORE INTO "${table}" (${cols.map((c) => `"${c}"`).join(",")}) VALUES (${cols.map(() => "?").join(",")})`,
    );
    for (const row of rows) {
      try { inserted += stmt.run(cols.map((c) => row[c] as never)).changes; } catch { /* table shape moved on */ }
    }
  }
  src.close();
  live.close();
  return inserted;
}

function restoreTree(zip: AdmZip, prefix: string, dest: string, replace: boolean): number {
  const entries = (zip.getEntries() as ZipEntry[]).filter((e) => !e.isDirectory && e.entryName.startsWith(prefix));
  if (!entries.length) return 0;
  if (replace && existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  let written = 0;
  for (const e of entries) {
    const rel = e.entryName.slice(prefix.length);
    if (!rel) continue;
    const target = join(dest, rel);
    if (!replace && existsSync(target)) continue;
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, e.getData());
    written++;
  }
  return written;
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let tmpDir = "";
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const zip = new AdmZip(Buffer.from(await file.arrayBuffer()));
    const found = detect(zip);

    // Step one: look, do not touch.
    if (req.nextUrl.searchParams.get("inspect") === "1") {
      return NextResponse.json(
        { ok: true, ...found, sizeBytes: file.size },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const askedRaw = (formData.get("parts") as string | null) ?? "";
    const asked = new Set((askedRaw ? askedRaw.split(",") : found.parts).map((s) => s.trim()).filter(Boolean));

    tmpDir = mkdtempSync("/tmp/fractera-restore-");
    const stats: Record<string, number> = {};
    let ragTouched = false;

    if (asked.has("db")) {
      const e = zip.getEntry("app.db");
      if (e) stats.dbRows = mergeSqlite(e.getData(), APP_DB, tmpDir, "app.db");
    }

    if (asked.has("files")) {
      const e = zip.getEntry("media.db");
      if (e) stats.mediaRows = mergeSqlite(e.getData(), MEDIA_DB, tmpDir, "media.db");
      stats.mediaFiles = restoreTree(zip, "storage/", STORAGE_DIR, false);
    }

    if (asked.has("knowledge")) {
      // A graph cannot be merged: entities and relations from two different runs
      // would contradict each other. The archive wins wholesale.
      stats.knowledgeFiles = restoreTree(zip, "knowledge/", KNOWLEDGE_DIR, true);
      ragTouched = stats.knowledgeFiles > 0;
    }

    if (asked.has("config")) {
      stats.configFiles =
        restoreTree(zip, "APP-CONFIG/", join(APP_DIR, "APP-CONFIG"), true) +
        restoreTree(zip, "PLATFORM-CONFIG/", join(APP_DIR, "PLATFORM-CONFIG"), true);
    }

    if (asked.has("channels")) {
      const e = zip.getEntry("channels-config.json");
      if (e) {
        mkdirSync(dirname(CHANNELS_CONFIG), { recursive: true });
        writeFileSync(CHANNELS_CONFIG, e.getData(), { mode: 0o600 });
        hardenSecretFile(CHANNELS_CONFIG);
        stats.channels = 1;
      }
    }

    if (asked.has("env")) {
      const e = zip.getEntry("env.local");
      if (e) {
        writeFileSync(join(APP_DIR, ".env.local"), e.getData(), { mode: 0o600 });
        hardenSecretFile(join(APP_DIR, ".env.local"));
        stats.env = 1;
      }
    }

    // The RAG service holds its graph in memory; restored files only become the
    // truth after it reads them again.
    if (ragTouched) {
      try { execSync("pm2 restart fractera-rag", { timeout: 30_000, stdio: "ignore" }); } catch { /* stopped by the architect */ }
    }

    return NextResponse.json({ ok: true, restored: [...asked], stats });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  } finally {
    if (tmpDir && existsSync(tmpDir)) {
      try { rmSync(tmpDir, { recursive: true }); } catch { /* temp dir, best effort */ }
    }
  }
}
