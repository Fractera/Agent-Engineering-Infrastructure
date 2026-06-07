import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import crypto from "crypto";
import { requireAuth } from "@/lib/require-auth";

const APP_DB = process.env.APP_DB_PATH ?? "/opt/fractera/app/data/app.db";

// Projects let the developer split their codebase / deployment journal by
// project. Canonical schema lives in app/lib/db SCHEMA; we CREATE IF NOT EXISTS
// here too so the admin works even before the app layer restarts, and seed a
// "default" row so existing deployment rows (project='default') always match.
function open(readonly = false): InstanceType<typeof Database> {
  const db = new Database(APP_DB, { readonly });
  if (!readonly) {
    db.exec(`CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`);
    db.prepare(
      "INSERT OR IGNORE INTO projects (id, name) VALUES (?, 'default')"
    ).run(crypto.randomUUID());
  }
  return db;
}

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = open(false); // open writable once to ensure table + default seed
    const rows = db.prepare(
      // 'default' first, then newest projects
      "SELECT id, name, created_at FROM projects ORDER BY (name = 'default') DESC, created_at DESC"
    ).all();
    db.close();
    return NextResponse.json({ projects: rows });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { name?: unknown };
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (name.length > 60) return NextResponse.json({ error: "name too long (max 60)" }, { status: 400 });

  try {
    const db = open(false);
    const existing = db.prepare("SELECT id, name, created_at FROM projects WHERE name = ?").get(name);
    if (existing) { db.close(); return NextResponse.json({ project: existing, existed: true }); }
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO projects (id, name) VALUES (?, ?)").run(id, name);
    const project = db.prepare("SELECT id, name, created_at FROM projects WHERE id = ?").get(id);
    db.close();
    return NextResponse.json({ project }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
