import { getDb } from "./index";

export function runMigrations() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      nickname TEXT,
      password TEXT,
      roles TEXT NOT NULL DEFAULT '["user"]',
      avatar_url TEXT,
      bio TEXT,
      locale TEXT DEFAULT 'en',
      timezone TEXT,
      provider TEXT NOT NULL DEFAULT 'credentials',
      email_verified TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires TEXT NOT NULL,
      session_token TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      UNIQUE(provider, provider_account_id)
    );

    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL,
      expires TEXT NOT NULL,
      UNIQUE(identifier, token)
    );
  `);

  // Existing databases (created before OAuth/magic-link support) miss the
  // adapter columns on `accounts`. Add them idempotently so the NextAuth
  // SqliteAdapter (linkAccount) can persist the full OAuth account record.
  const accountCols = (db.prepare("PRAGMA table_info(accounts)").all() as { name: string }[]).map((c) => c.name);
  for (const col of ["token_type", "scope", "id_token", "session_state"]) {
    if (!accountCols.includes(col)) {
      db.exec(`ALTER TABLE accounts ADD COLUMN ${col} TEXT`);
    }
  }
}
