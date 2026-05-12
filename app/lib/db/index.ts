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
  )
`

function makeLocalDb() {
  const dbPath = process.env.APP_DB_PATH ?? join(process.cwd(), "data", "app.db")
  mkdirSync(dirname(dbPath), { recursive: true })
  const sqlite = new Database(dbPath)
  sqlite.exec(SCHEMA)
  const cols = new Set(
    (sqlite.prepare('PRAGMA table_info(products)').all() as Array<{ name: string }>).map(c => c.name)
  )
  if (!cols.has('media_id'))   sqlite.exec(`ALTER TABLE products ADD COLUMN media_id   TEXT`)
  if (!cols.has('media_url'))  sqlite.exec(`ALTER TABLE products ADD COLUMN media_url  TEXT`)
  if (!cols.has('created_by')) sqlite.exec(`ALTER TABLE products ADD COLUMN created_by TEXT NOT NULL DEFAULT 'system'`)
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
