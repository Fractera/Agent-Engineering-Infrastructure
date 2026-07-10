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
    step           TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    created_by     TEXT NOT NULL DEFAULT 'system'
  );
  -- Cron journal (Projects layer). The substrate runner (fractera-cron) carries the SAME
  -- two CREATE TABLE statements so an empty slot still gets the tables — keep the DDL
  -- textually identical in both places when changing it.
  CREATE TABLE IF NOT EXISTS project_cron_jobs (
    id          TEXT PRIMARY KEY NOT NULL,
    category    TEXT NOT NULL,
    project     TEXT NOT NULL,
    job_id      TEXT NOT NULL,
    title       TEXT NOT NULL DEFAULT '',
    schedule    TEXT NOT NULL,
    action      TEXT NOT NULL,
    enabled     INTEGER NOT NULL DEFAULT 1,
    last_run_at TEXT,
    last_status TEXT,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS project_cron_runs (
    id          TEXT PRIMARY KEY NOT NULL,
    job_key     TEXT NOT NULL,
    category    TEXT NOT NULL,
    project     TEXT NOT NULL,
    process     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'in-progress',
    started_at  TEXT NOT NULL DEFAULT (datetime('now')),
    finished_at TEXT,
    result_title TEXT,
    result_url  TEXT,
    error       TEXT,
    created_by  TEXT NOT NULL DEFAULT 'fractera-cron'
  );
  -- Automation finance types (step 205, §E): the per-automation income/expense categories the
  -- document-parsing / voice finance action segments a record into. Capped at ≤10 per (project,kind)
  -- in the app layer (not a schema constraint); UNIQUE(project,kind,name) prevents duplicates. Replaces
  -- the removed project_hooks table — hooks are gone (one bot per automation, agent-channel-routing.md §8).
  CREATE TABLE IF NOT EXISTS automation_finance_types (
    id         TEXT PRIMARY KEY NOT NULL,
    project    TEXT NOT NULL,
    kind       TEXT NOT NULL,          -- 'income' | 'expense'
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(project, kind, name)
  );
  -- Inter-automation orchestration (ontology entity 13 + §D pub/sub, step 195). The substrate
  -- runner (fractera-cron) carries the SAME three CREATE TABLE statements — keep the DDL textually
  -- identical in both places when changing it.
  -- subjects: the shared long-lived object several automations act on (blogger/lead/customer).
  -- One stable id + a status state machine + free-form attributes; owner_automation names the
  -- automation currently driving it.
  CREATE TABLE IF NOT EXISTS subjects (
    id               TEXT PRIMARY KEY NOT NULL,
    kind             TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT '',
    owner_automation TEXT NOT NULL DEFAULT '',
    attributes       TEXT NOT NULL DEFAULT '{}',
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );
  -- subject_events: the append-only history of everything that ever touched a subject —
  -- one query on subject_id gives the whole timeline (no per-state table hopping).
  CREATE TABLE IF NOT EXISTS subject_events (
    id           TEXT PRIMARY KEY NOT NULL,
    subject_id   TEXT NOT NULL,
    event        TEXT NOT NULL,
    from_automation TEXT NOT NULL DEFAULT '',
    payload      TEXT NOT NULL DEFAULT '{}',
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
  -- automation_events: the pub/sub queue the dispatcher drains. An Action's emit inserts a row;
  -- the substrate runner finds every subscriber and POSTs its /run, then marks dispatched.
  CREATE TABLE IF NOT EXISTS automation_events (
    id            TEXT PRIMARY KEY NOT NULL,
    event         TEXT NOT NULL,
    subject_id    TEXT NOT NULL DEFAULT '',
    from_automation TEXT NOT NULL DEFAULT '',
    payload       TEXT NOT NULL DEFAULT '{}',
    published_at  TEXT NOT NULL DEFAULT (datetime('now')),
    dispatched    INTEGER NOT NULL DEFAULT 0
  );
  -- telegram-notes automation (step 188) — the DEFAULT automation shipped with the starter.
  -- Key/value cursor store for the Telegram getUpdates poller (last_update_id) — one row per
  -- key, self-sufficient (no Hermes).
  CREATE TABLE IF NOT EXISTS telegram_notes_state (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT
  );
  -- telegram-notes records (step 188): one row per saved note / date-reminder / recall request.
  -- summary feeds the project-page results table; reminder_due (unix seconds) is set only for
  -- date reminders and delivered flips to 1 once the push is sent. hook_action = the Action id
  -- (save|remind|recall); hook_phrase = the exact phrase that fired; condition = the declared-guard
  -- outcome (automation-ontology trace, 188-R). memory_track_id holds the LightRAG track id from
  -- ingest so delete removes BOTH stores (SQLite row + vector document).
  CREATE TABLE IF NOT EXISTS telegram_notes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    project_slug    TEXT NOT NULL DEFAULT 'telegram-notes',
    hook_action     TEXT NOT NULL,
    hook_phrase     TEXT NOT NULL DEFAULT '',
    condition       TEXT,
    chat_id         TEXT NOT NULL,
    msg_date        INTEGER,
    reminder_due    INTEGER,
    delivered       INTEGER NOT NULL DEFAULT 0,
    full_text       TEXT NOT NULL DEFAULT '',
    summary         TEXT NOT NULL DEFAULT '',
    memory_track_id TEXT,
    -- Finance / document-parsing action (step 205, §E): a parsed receipt or a voice finance note
    -- writes a money movement here. income/expense are amounts (one is set per record); fin_type is
    -- one of automation_finance_types.name; image_url is the media-storage link to the original photo.
    income          REAL,
    expense         REAL,
    fin_type        TEXT,
    image_url       TEXT,
    -- Reminder as EVENT + REMINDER (step 207): reminder_due = when to notify; event_at = when the
    -- thing actually happens (unix seconds). One message can yield several such rows.
    event_at        INTEGER,
    -- External calendar sync (step 207 Phase F): the Google Calendar event id created for this reminder
    -- (idempotency — sync/delete the same external event instead of duplicating). NULL until pushed;
    -- inert when the calendar connector has no creds/token.
    external_event_id TEXT,
    created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
  -- Finance ledger (step 207) — a SEPARATE table from telegram_notes (owner decision). One row per
  -- money movement. kind = income|expense; amount = the sum; categories = a JSON array of preset
  -- category ids (multi-flag, from _data/finance-categories.ts); image_url = the receipt photo link.
  -- (The telegram_notes.income/expense/fin_type columns from step 205 are deprecated — finance now
  -- lives here; the old columns stay for backward-compat but are no longer written.)
  CREATE TABLE IF NOT EXISTS automation_finance (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    project      TEXT NOT NULL DEFAULT 'telegram-notes',
    kind         TEXT NOT NULL,          -- 'income' | 'expense'
    amount       REAL NOT NULL DEFAULT 0,
    categories   TEXT NOT NULL DEFAULT '[]',  -- JSON array of preset category ids (multi-flag)
    summary      TEXT NOT NULL DEFAULT '',
    image_url    TEXT,
    chat_id      TEXT NOT NULL DEFAULT '',
    msg_date     INTEGER,
    -- Vector-memory link (step 207.16, owner contract): EVERY finance record is ingested into LightRAG
    -- and this column stores the ingest track id — the local row and the memory doc are one pair (same
    -- contract as telegram_notes.memory_track_id; the duplicate-removal path deletes both together).
    memory_track_id TEXT,
    created_at   INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
  -- Image registry (step 207.18, rules R2/R3): every incoming photo is a FIRST-CLASS row the moment it
  -- arrives — media upload gives the URL, a cheap vision call gives the short description ("interior of
  -- a cafe" / "receipt: pie 5.50, coffee 2.00"). status=pending until linked; pending images live
  -- FOREVER (no TTL) so nothing the user sent is ever silently lost.
  CREATE TABLE IF NOT EXISTS automation_images (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project     TEXT NOT NULL DEFAULT 'telegram-notes',
    media_url   TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    chat_id     TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'linked'
    -- kind_hint (step 207.18d, owner rule "финансовое отдельно от информационного"): 'document' = a
    -- receipt/invoice (belongs to FINANCE records); 'photo' = anything else — a pie, an interior, a
    -- residence (belongs to NOTES). Set from the vision analysis at intake; drives link routing.
    kind_hint   TEXT NOT NULL DEFAULT 'photo',
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
  -- Record ⇄ image links (step 207.18, rule R3): MANY-TO-MANY across BOTH record kinds — one photo may
  -- belong to a note AND a finance record (cafe interior ↔ the visit note + the pie purchase); one
  -- record may carry several photos (interior + receipt). The answer path always resolves photos
  -- through THIS table (rule R6) — never by "latest receipt" guessing.
  CREATE TABLE IF NOT EXISTS record_images (
    record_kind TEXT NOT NULL,                     -- 'note' | 'finance'
    record_id   INTEGER NOT NULL,
    image_id    INTEGER NOT NULL,
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    PRIMARY KEY (record_kind, record_id, image_id)
  );
  -- Geo-mark registry (step 207.20): every incoming Telegram location / Google-Maps link becomes a
  -- FIRST-CLASS row the moment it arrives — the 4th storage next to notes, finance and images. Bot API
  -- strips EXIF/GPS from photos, so geo arrives ONLY as a location attach or a maps link. status=pending
  -- until linked (mirror of automation_images); pending rows live forever.
  CREATE TABLE IF NOT EXISTS automation_geo (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project     TEXT NOT NULL DEFAULT 'telegram-notes',
    chat_id     TEXT NOT NULL DEFAULT '',
    lat         REAL NOT NULL,
    lng         REAL NOT NULL,
    label       TEXT NOT NULL DEFAULT '',            -- venue title / user's words
    source      TEXT NOT NULL DEFAULT 'telegram',    -- 'telegram-location' | 'maps-link'
    status      TEXT NOT NULL DEFAULT 'pending',     -- 'pending' | 'linked'
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
  -- Record ⇄ geo links (step 207.20): MANY-TO-MANY across BOTH record kinds, mirror of record_images —
  -- one place may belong to a note AND a finance record; the answer path resolves places ONLY through
  -- this table («напомни где я ел пирожки» → 📍 maps link).
  CREATE TABLE IF NOT EXISTS record_geo (
    record_kind TEXT NOT NULL,                       -- 'note' | 'finance'
    record_id   INTEGER NOT NULL,
    geo_id      INTEGER NOT NULL,
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    PRIMARY KEY (record_kind, record_id, geo_id)
  );
  -- External calendar OAuth tokens (step 207 Phase F) — per-project Google Calendar connection. One row
  -- per project; refresh_token drives long-lived access, access_token/expiry are the short-lived pair.
  -- Inert without GOOGLE_OAUTH_CLIENT_ID/SECRET (self-sufficiency): no row → the connector is "not
  -- connected" and the reminder push is a no-op.
  CREATE TABLE IF NOT EXISTS automation_calendar_tokens (
    project       TEXT PRIMARY KEY NOT NULL,
    provider      TEXT NOT NULL DEFAULT 'google',
    access_token  TEXT,
    refresh_token TEXT,
    expiry        INTEGER,
    created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
`

// The architecture three streams (projects / pages / endpoints) and their tasks
// moved fully to the filesystem (README.md per entity, step 108) — these tables
// are abandoned. Drop them so no stale architecture state survives in the DB.
const DROP_LEGACY = `
  DROP TABLE IF EXISTS projects;
  DROP TABLE IF EXISTS requested_routes;
  DROP TABLE IF EXISTS route_tasks;
  -- step 205 §C: hooks removed (one bot per automation). Drop the global phrase registry so no
  -- stale hook rows survive on an upgraded server; routing no longer reads this table.
  DROP TABLE IF EXISTS project_hooks;
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
  sqlite.exec(DROP_LEGACY)
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
  // telegram_notes.hook_phrase / condition / memory_track_id (automation ontology 188-R + delete
  // contract) — added after the table shipped, so a live DB (rows already saved) needs them via ALTER.
  const tnCols = new Set(
    (sqlite.prepare('PRAGMA table_info(telegram_notes)').all() as Array<{ name: string }>).map(c => c.name)
  )
  if (tnCols.size && !tnCols.has('hook_phrase'))     safeAddColumn(sqlite, `ALTER TABLE telegram_notes ADD COLUMN hook_phrase TEXT NOT NULL DEFAULT ''`)
  if (tnCols.size && !tnCols.has('condition'))       safeAddColumn(sqlite, `ALTER TABLE telegram_notes ADD COLUMN condition TEXT`)
  if (tnCols.size && !tnCols.has('memory_track_id')) safeAddColumn(sqlite, `ALTER TABLE telegram_notes ADD COLUMN memory_track_id TEXT`)
  // telegram_notes finance columns (step 205 §E) — live DBs get them via ALTER.
  if (tnCols.size && !tnCols.has('income'))    safeAddColumn(sqlite, `ALTER TABLE telegram_notes ADD COLUMN income REAL`)
  if (tnCols.size && !tnCols.has('expense'))   safeAddColumn(sqlite, `ALTER TABLE telegram_notes ADD COLUMN expense REAL`)
  if (tnCols.size && !tnCols.has('fin_type'))  safeAddColumn(sqlite, `ALTER TABLE telegram_notes ADD COLUMN fin_type TEXT`)
  if (tnCols.size && !tnCols.has('image_url')) safeAddColumn(sqlite, `ALTER TABLE telegram_notes ADD COLUMN image_url TEXT`)
  // telegram_notes.event_at (step 207 — reminder as event+reminder) — live DBs get it via ALTER.
  if (tnCols.size && !tnCols.has('event_at'))  safeAddColumn(sqlite, `ALTER TABLE telegram_notes ADD COLUMN event_at INTEGER`)
  // telegram_notes.external_event_id (step 207 Phase F — external calendar sync) — live DBs get it via ALTER.
  if (tnCols.size && !tnCols.has('external_event_id')) safeAddColumn(sqlite, `ALTER TABLE telegram_notes ADD COLUMN external_event_id TEXT`)
  // automation_finance.memory_track_id (step 207.16 — finance rows are ingested into LightRAG; the row
  // stores the ingest track id) — live DBs get it via ALTER.
  const afCols = new Set(
    (sqlite.prepare('PRAGMA table_info(automation_finance)').all() as Array<{ name: string }>).map(c => c.name)
  )
  if (afCols.size && !afCols.has('memory_track_id')) safeAddColumn(sqlite, `ALTER TABLE automation_finance ADD COLUMN memory_track_id TEXT`)
  // automation_images.kind_hint (step 207.18d — document vs photo routing) — live DBs get it via ALTER.
  const aiCols = new Set(
    (sqlite.prepare('PRAGMA table_info(automation_images)').all() as Array<{ name: string }>).map(c => c.name)
  )
  if (aiCols.size && !aiCols.has('kind_hint')) safeAddColumn(sqlite, `ALTER TABLE automation_images ADD COLUMN kind_hint TEXT NOT NULL DEFAULT 'photo'`)
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
  await remoteDb.exec(DROP_LEGACY.trim())
}

export const db = (process.env.REMOTE_DATA_URL && process.env.DATA_API_KEY)
  ? (initRemoteSchema().catch(console.error), remoteDb)
  : makeLocalDb()
