import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace(/^file:/, "")
  : path.join(process.cwd(), "data", "auth.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    // `auth.ts` builds the NextAuth adapter eagerly at import: SqliteAdapter(getDb()).
    // During `next build`, the /api/auth/[...nextauth] route module is imported by
    // MULTIPLE parallel build workers ("Collecting page data using N workers"), so
    // each worker would open the same auth.db file and run migrations concurrently.
    // That deadlocks SQLite (SQLITE_BUSY) — and busy_timeout/WAL do NOT help, because
    // a write-write upgrade deadlock returns SQLITE_BUSY immediately (the busy handler
    // is skipped by design to break the deadlock). That is what failed the build_auth
    // step. The route is dynamic, so NO adapter DB method runs at build — only the
    // import — and SqliteAdapter touches the DB only inside its methods (lazy prepare),
    // never at construction. So at build time we hand each worker a private in-memory
    // DB: zero file contention, no migrations. The real file DB + WAL + migrations run
    // only at runtime, in the single pm2 process.
    // → reports/errors/sqlite-busy-build-concurrent-migration.md
    if (process.env.NEXT_PHASE === "phase-production-build") {
      _db = new Database(":memory:");
      return _db;
    }
    fs.mkdirSync(path.dirname(path.resolve(DB_PATH)), { recursive: true });
    _db = new Database(DB_PATH);
    // Defence-in-depth for any other concurrent opener at runtime: wait for a held
    // lock instead of throwing SQLITE_BUSY instantly (default busy_timeout = 0).
    _db.pragma("busy_timeout = 5000");
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    const { runMigrations } = require("./migrations");
    runMigrations();
  }
  return _db;
}
