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
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    created_by     TEXT NOT NULL DEFAULT 'system'
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
