import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace(/^file:/, "")
  : path.join(process.cwd(), "data", "auth.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    fs.mkdirSync(path.dirname(path.resolve(DB_PATH)), { recursive: true });
    _db = new Database(DB_PATH);
    // Wait up to 5s for a held lock instead of throwing SQLITE_BUSY instantly
    // (better-sqlite3 default busy_timeout = 0). At `next build` the auth config
    // module (`auth.ts`: NextAuth({ adapter: SqliteAdapter(getDb()) })) is evaluated
    // eagerly by MULTIPLE build workers, each calling getDb() → runMigrations() →
    // concurrent writes on auth.db. WAL allows one writer at a time; without a busy
    // timeout the second worker fails the whole build. → reports/errors/sqlite-busy-build-concurrent-migration.md
    _db.pragma("busy_timeout = 5000");
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    const { runMigrations } = require("./migrations");
    runMigrations();
  }
  return _db;
}
