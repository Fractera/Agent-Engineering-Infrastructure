import Database from "better-sqlite3"
import { mkdirSync } from "fs"
import { join, dirname } from "path"
import { remoteDb } from "./remote-client"

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS products (
    id         TEXT PRIMARY KEY NOT NULL,
    name       TEXT NOT NULL,
    price      REAL NOT NULL DEFAULT 0,
    media_id   TEXT,
    media_url  TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS site_settings (
    id            INTEGER PRIMARY KEY DEFAULT 1,
    custom_domain TEXT,
    domain_status TEXT NOT NULL DEFAULT 'idle',
    domain_error  TEXT,
    updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );
  CREATE TABLE IF NOT EXISTS projects (
    id         TEXT PRIMARY KEY NOT NULL,
    name       TEXT NOT NULL UNIQUE,
    slug       TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS deployment_records (
    id             TEXT PRIMARY KEY NOT NULL,
    result         INTEGER NOT NULL DEFAULT 3,
    project        TEXT NOT NULL DEFAULT 'default',
    tokens         INTEGER NOT NULL DEFAULT 0,
    platform       TEXT,
    model          TEXT,
    page_url       TEXT,
    commit_message TEXT,
    status         TEXT NOT NULL DEFAULT 'ready',
    duration_ms    INTEGER,
    commit_hash    TEXT,
    branch         TEXT,
    author         TEXT,
    step           TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    created_by     TEXT NOT NULL DEFAULT 'system'
  );
  CREATE TABLE IF NOT EXISTS requested_routes (
    id         TEXT PRIMARY KEY NOT NULL,
    slug       TEXT NOT NULL,
    kind       TEXT NOT NULL DEFAULT 'page',
    base       TEXT NOT NULL DEFAULT '/',
    dynamic    INTEGER NOT NULL DEFAULT 0,
    query      TEXT NOT NULL DEFAULT '[]',
    title      TEXT NOT NULL,
    todo       TEXT NOT NULL DEFAULT '[]',
    status     TEXT NOT NULL DEFAULT 'requested',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT NOT NULL DEFAULT 'system'
  );
  CREATE TABLE IF NOT EXISTS route_tasks (
    id         TEXT PRIMARY KEY NOT NULL,
    path       TEXT NOT NULL,
    kind       TEXT NOT NULL DEFAULT 'todo',
    body       TEXT NOT NULL,
    outcome    TEXT,
    status     TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT NOT NULL DEFAULT 'system'
  );
`

// ALTER TABLE ADD COLUMN must tolerate the "duplicate column" error: during
// `next build`, Next.js spawns multiple workers that all evaluate this
// module concurrently. Each worker reads PRAGMA table_info and decides to
// add the column, then a slower worker races against a faster one's
// successful ALTER and gets a SQLITE_ERROR. The exists-check is correct
// for steady-state but not race-safe — wrap each ALTER so duplicate-column
// is treated as success (the column already exists, that's what we wanted).
function safeAddColumn(sqlite: Database.Database, sql: string) {
  try {
    sqlite.exec(sql)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/duplicate column/i.test(msg)) return
    throw e
  }
}

function makeLocalDb() {
  const dbPath = process.env.APP_DB_PATH ?? join(process.cwd(), "data", "app.db")
  mkdirSync(dirname(dbPath), { recursive: true })
  const sqlite = new Database(dbPath)
  sqlite.exec(SCHEMA)
  const cols = new Set(
    (sqlite.prepare('PRAGMA table_info(products)').all() as Array<{ name: string }>).map(c => c.name)
  )
  if (!cols.has('media_id'))   safeAddColumn(sqlite, `ALTER TABLE products ADD COLUMN media_id   TEXT`)
  if (!cols.has('media_url'))  safeAddColumn(sqlite, `ALTER TABLE products ADD COLUMN media_url  TEXT`)
  if (!cols.has('created_by')) safeAddColumn(sqlite, `ALTER TABLE products ADD COLUMN created_by TEXT NOT NULL DEFAULT 'system'`)
  // deployment_records.step (Product Loop) — added after the table shipped, so
  // existing DBs need the column via ALTER (CREATE TABLE IF NOT EXISTS won't).
  const depCols = new Set(
    (sqlite.prepare('PRAGMA table_info(deployment_records)').all() as Array<{ name: string }>).map(c => c.name)
  )
  if (depCols.size && !depCols.has('step')) safeAddColumn(sqlite, `ALTER TABLE deployment_records ADD COLUMN step TEXT`)
  // projects.slug (project layer, step 104) — added after the table shipped.
  const projCols = new Set(
    (sqlite.prepare('PRAGMA table_info(projects)').all() as Array<{ name: string }>).map(c => c.name)
  )
  if (projCols.size && !projCols.has('slug')) safeAddColumn(sqlite, `ALTER TABLE projects ADD COLUMN slug TEXT`)
  // requested_routes.base (project layer — add page at any depth, step 105).
  const reqCols = new Set(
    (sqlite.prepare('PRAGMA table_info(requested_routes)').all() as Array<{ name: string }>).map(c => c.name)
  )
  if (reqCols.size && !reqCols.has('kind')) safeAddColumn(sqlite, `ALTER TABLE requested_routes ADD COLUMN kind TEXT NOT NULL DEFAULT 'page'`)
  if (reqCols.size && !reqCols.has('base')) safeAddColumn(sqlite, `ALTER TABLE requested_routes ADD COLUMN base TEXT NOT NULL DEFAULT '/'`)
  if (reqCols.size && !reqCols.has('dynamic')) safeAddColumn(sqlite, `ALTER TABLE requested_routes ADD COLUMN dynamic INTEGER NOT NULL DEFAULT 0`)
  if (reqCols.size && !reqCols.has('query')) safeAddColumn(sqlite, `ALTER TABLE requested_routes ADD COLUMN query TEXT NOT NULL DEFAULT '[]'`)
  return {
    prepare(sql: string) {
      const stmt = sqlite.prepare(sql)
      return {
        async all(...args: unknown[]) { return stmt.all(...args) as Record<string, unknown>[] },
        async get(...args: unknown[]) { return (stmt.get(...args) ?? null) as Record<string, unknown> | null },
        async run(...args: unknown[]) { return stmt.run(...args) },
      }
    },
    async exec(sql: string) { sqlite.exec(sql) },
  }
}

async function initRemoteSchema() {
  await remoteDb.exec(SCHEMA.trim())
}

export const db = (process.env.REMOTE_DATA_URL && process.env.DATA_API_KEY)
  ? (initRemoteSchema().catch(console.error), remoteDb)
  : makeLocalDb()
