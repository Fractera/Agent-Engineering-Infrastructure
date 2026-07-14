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
  -- Diagram RUN state (step 223.C.3). The unified run model that answers "which node is working now"
  -- and drives the canvas's active-node orange highlight. automation = "<category>/<slug>";
  -- instance_id is null for a Master run (the simple/reactive scenario) and set for an Instance run
  -- (the finite-process scenario). current_node is the node running right now (null when finished).
  CREATE TABLE IF NOT EXISTS automation_runs (
    id           TEXT PRIMARY KEY NOT NULL,
    automation   TEXT NOT NULL,
    instance_id  TEXT,
    current_node TEXT,
    status       TEXT NOT NULL DEFAULT 'running',
    started_at   TEXT NOT NULL DEFAULT (datetime('now')),
    finished_at  TEXT,
    payload      TEXT NOT NULL DEFAULT '{}'
  );
  CREATE TABLE IF NOT EXISTS automation_run_nodes (
    id       TEXT PRIMARY KEY NOT NULL,
    run_id   TEXT NOT NULL,
    node_id  TEXT NOT NULL,
    status   TEXT NOT NULL DEFAULT 'idle',
    payload  TEXT NOT NULL DEFAULT '{}'
  );
  -- Master to Instance fork (step 223.C.4). An Instance is a fork of the Master into a sub-automation:
  -- it inherits ALL the Master nodes, then adds a specialization (the run overall condition, e.g.
  -- "about cats") and per-node overrides (JSON keyed by node_id: disabledFunctions and note, e.g.
  -- "do not use Siamese cats"). Editing one Instance never touches the Master or the sibling Instances.
  -- automation = "category/slug". A run of an Instance sets automation_runs.instance_id to its id.
  CREATE TABLE IF NOT EXISTS automation_instances (
    id             TEXT PRIMARY KEY NOT NULL,
    automation     TEXT NOT NULL,
    title          TEXT NOT NULL,
    specialization TEXT NOT NULL DEFAULT '',
    overrides      TEXT NOT NULL DEFAULT '{}',
    status         TEXT NOT NULL DEFAULT 'new',
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );
  -- DASHBOARD LIVE ROWS (step 229) — the live data store behind the config-driven dashboard tables (228).
  -- A dashboard table's COLUMNS are config (arbitrary and different per automation); its ROWS are here. The
  -- columns are arbitrary, and a live server cannot add a column to an existing table (CREATE TABLE IF NOT
  -- EXISTS never alters; the makeLocalDb ALTER path does not run on the data-service server — lesson 225 G4:
  -- "no column named subject"). So a row is NOT a column-per-field: every field lives inside values_json,
  -- keyed by the column source. This is a class-immunity to that bug. A table with no live rows falls
  -- back to the config seed rows (owner: live replaces, seed is the demo fallback so a fresh dashboard is
  -- not empty). Both the automation's own nodes (via the API) and the owner (via the UI) write rows here.
  CREATE TABLE IF NOT EXISTS dashboard_rows (
    id          TEXT PRIMARY KEY NOT NULL,
    automation  TEXT NOT NULL,
    table_id    TEXT NOT NULL,
    values_json TEXT NOT NULL DEFAULT '{}',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  -- ENTITIES live overrides (step 237) — the hamburger-menu switches (Diagram/Calendar/Map/Dashboard/
  -- Processes/Analytics/User cases) write here so a toggle takes effect INSTANTLY, no rebuild: the
  -- automation page is statically prerendered (canon), so a flag baked only into _data/config.ts would need
  -- a rebuild to show — same class of lag the owner already hit with category/automation creation (fix
  -- 069030a). One JSON-blob row per automation (same class-immunity to live-ALTER as dashboard_rows, lesson
  -- 225 G4); a project's _data/config.ts stays the SEED, this table is the override merged on top and wins.
  CREATE TABLE IF NOT EXISTS automation_entities (
    automation    TEXT PRIMARY KEY NOT NULL,
    entities_json TEXT NOT NULL DEFAULT '{}',
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
  -- THE ENTITY DISPLAY ORDER (step 241, owner) — one JSON array per automation holding the owner's dragged
  -- order of the page's sections (diagram/calendar/map/dashboard/processes/analytics/usecases + fork
  -- activation). Same live-override shape as automation_entities: _data/config.ts / DEFAULT_ENTITY_ORDER is
  -- the SEED, a row here (once the owner drags) wins and reorders the accordions with NO rebuild.
  CREATE TABLE IF NOT EXISTS automation_entity_order (
    automation TEXT PRIMARY KEY NOT NULL,
    order_json TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  -- Diagram Builder mode (step 224). Two axes the file-based diagram never had: a LIVE lightweight canvas
  -- index (so a Builder-created node renders instantly without a rebuild) and per-node VERSION HISTORY.
  -- Identity is a CUID (owner: weak models mangle the UUID format) that is stable across a folder rename,
  -- so version history never breaks. The files on disk are always the ACTIVE version (Model B); this table
  -- is the projection the canvas reads + the version pointers. active_version can lag latest_version after
  -- a rollback. draft=1 -> the node is a not-yet-built stub (empty functions.ts + a spec.md), rendered with
  -- a red frame and IGNORED by execution (a project with any draft auto-stops -> status In development).
  CREATE TABLE IF NOT EXISTS automation_nodes (
    cuid            TEXT PRIMARY KEY NOT NULL,
    automation      TEXT NOT NULL,
    slug            TEXT NOT NULL,
    name            TEXT NOT NULL DEFAULT '',
    parent_cuid     TEXT,
    ord             INTEGER NOT NULL DEFAULT 0,
    x               REAL,
    y               REAL,
    draft           INTEGER NOT NULL DEFAULT 1,
    active_version  INTEGER NOT NULL DEFAULT 0,
    latest_version  INTEGER NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'draft',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
  -- FROZEN (step 238 Phase 1) — superseded by the generic entity_history table (entity_type='node'). Kept
  -- CREATE TABLE IF NOT EXISTS only so a pre-238 server's already-recorded rows are never dropped;
  -- migrateLegacyVersionsOnce() (lib/entity-architecture.ts) copies them into entity_history once, after
  -- which nothing reads or writes this table again. Do not add new columns or new writers here.
  CREATE TABLE IF NOT EXISTS automation_node_versions (
    id              TEXT PRIMARY KEY NOT NULL,
    automation      TEXT NOT NULL,
    node_cuid       TEXT NOT NULL,
    version         INTEGER NOT NULL,
    meta_json       TEXT NOT NULL DEFAULT '{}',
    functions_src   TEXT NOT NULL DEFAULT '',
    instruction_src TEXT NOT NULL DEFAULT '',
    spec_src        TEXT NOT NULL DEFAULT '',
    summary         TEXT NOT NULL DEFAULT '',
    dev_step_ref    TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(node_cuid, version)
  );
  -- PROCESSES / Gantt timeline (step 230). One row per FORK (automation_instances). The timeline draws each
  -- fork as a bar whose length is planned_duration_ms = the sum of its nodes est process times (from each
  -- node meta.ts estDurationMs), laid out as a priority queue; the actual_start/actual_end come from
  -- automation_runs and shift the queue when reality differs from the plan. A NEW table, so no ALTER on the
  -- already-existing automation_instances/automation_nodes (lesson 225 G4). Recomputed on demand + by a
  -- once-a-minute cron tick; a fork with no schedule row yet is planned on first read.
  CREATE TABLE IF NOT EXISTS automation_schedule (
    instance_id         TEXT PRIMARY KEY NOT NULL,
    automation          TEXT NOT NULL,
    ord                 INTEGER NOT NULL DEFAULT 0,
    planned_start       TEXT,
    planned_duration_ms INTEGER NOT NULL DEFAULT 0,
    actual_start        TEXT,
    actual_end          TEXT,
    status              TEXT NOT NULL DEFAULT 'scheduled',
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
  );
  -- GLOBAL AUTOMATION CANVAS (step 225) — the workspace-level graph: every PROJECT is a node, and an EDGE
  -- is a programmable integration BETWEEN two automations. Unlike the tree inside one automation (224), the
  -- global graph is ARBITRARY: an edge may join any node of X to any node of Y (not only parents/children).
  -- The edge is a first-class entity with the SAME lifecycle as a node (draft -> spec -> dev step -> coder
  -- -> version), and its code lives in its own folder projects/_edges/<cuid>/ — it belongs to NO project
  -- (it is between them); deleting a project cascades to its edges, so no orphans remain.
  --
  -- THE READINESS GATE (the step's central rule): a custom edge may be created ONLY between nodes whose
  -- development is FINISHED — i.e. neither endpoint automation is "In development". Creating an edge always
  -- changes its endpoint nodes, so they must be built first. An attempted edge between unfinished projects
  -- is drawn as a RED DASHED line, bolds on hover, and on click explains itself in an error toast.
  CREATE TABLE IF NOT EXISTS automation_edges (
    cuid            TEXT PRIMARY KEY NOT NULL,
    from_automation TEXT NOT NULL,
    to_automation   TEXT NOT NULL,
    from_node_cuid  TEXT,
    to_node_cuid    TEXT,
    name            TEXT NOT NULL DEFAULT '',
    draft           INTEGER NOT NULL DEFAULT 1,
    active_version  INTEGER NOT NULL DEFAULT 0,
    latest_version  INTEGER NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'draft',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
  -- FROZEN (step 238 Phase 2) — same reasoning as automation_node_versions above; superseded by
  -- entity_history (entity_type='edge').
  CREATE TABLE IF NOT EXISTS automation_edge_versions (
    id            TEXT PRIMARY KEY NOT NULL,
    edge_cuid     TEXT NOT NULL,
    version       INTEGER NOT NULL,
    meta_json     TEXT NOT NULL DEFAULT '{}',
    functions_src TEXT NOT NULL DEFAULT '',
    spec_src      TEXT NOT NULL DEFAULT '',
    summary       TEXT NOT NULL DEFAULT '',
    dev_step_ref  TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(edge_cuid, version)
  );
  -- The global automation itself has a state: in-development (any edge is still a draft) | on | off.
  -- OFF does NOT stop the projects — they keep running exactly as before, only the global SYNCHRONISATION
  -- between them (the edges) stops. One row; it also stores the canvas layout of the project nodes.
  CREATE TABLE IF NOT EXISTS global_automation (
    id         INTEGER PRIMARY KEY CHECK (id = 1),
    status     TEXT NOT NULL DEFAULT 'in-development',
    layout     TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  -- ACTIVATION QUIZ (step 227) — phase 2 of an automation's birth. Phase 1 (the creation modal, step 224)
  -- captured the type + the owner's instruction and left a bare page whose nodes are drafts. On the FIRST
  -- visit the Quiz opens and brainstorms the instruction into real nodes: one quiz step = one NODE + one
  -- development sub-step. It runs in the project's DEFAULT LANGUAGE (English only when none is set) and is
  -- capped at 10 nodes per development step so the context never overflows. The turns are stored so a
  -- reload resumes exactly where it stopped.
  --
  -- STEP 225 G4 — the Quiz is generalized over its SUBJECT: it now brainstorms either a PROJECT (nodes) or
  -- an EDGE of the global canvas (how two automations are linked). The row key stays the single automation
  -- column (no UNIQUE migration): a project's key is "category/slug", an edge's key is "edge:<cuid>". The
  -- subject/subject_ref columns make that key self-describing (and queryable) without a second table.
  CREATE TABLE IF NOT EXISTS automation_quiz (
    id          TEXT PRIMARY KEY NOT NULL,
    automation  TEXT NOT NULL UNIQUE,             -- "category/slug" | "edge:<cuid>"
    subject     TEXT NOT NULL DEFAULT 'project',  -- project | edge
    subject_ref TEXT,                             -- the edge cuid when subject = 'edge'
    status      TEXT NOT NULL DEFAULT 'active',   -- active | done
    language    TEXT NOT NULL DEFAULT 'en',
    node_count  INTEGER NOT NULL DEFAULT 0,       -- nodes produced so far (cap 10); an edge quiz stays at 0
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    finished_at TEXT
  );
  CREATE TABLE IF NOT EXISTS automation_quiz_turns (
    id         TEXT PRIMARY KEY NOT NULL,
    quiz_id    TEXT NOT NULL,
    node_index INTEGER NOT NULL DEFAULT 0,        -- which node this turn belongs to
    role       TEXT NOT NULL,                     -- assistant | user
    content    TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  -- USER CASES (step 231) — the automation's scenarios, and the PRE-STAGE of its birth: the Quiz collects
  -- them BEFORE any node is designed, and no development step is created until the owner has read them back
  -- and confirmed that the AI understood him. The DB is the source; _data/use-cases.ts is the regenerated
  -- file artefact (the same Model-B split the diagram uses). status walks the lifecycle new → in-approval →
  -- approved → in-development → testing → in-use (_shared/use-cases.ts).
  CREATE TABLE IF NOT EXISTS automation_use_cases (
    cuid       TEXT PRIMARY KEY NOT NULL,
    automation TEXT NOT NULL,                     -- "category/slug"
    ord        INTEGER NOT NULL DEFAULT 0,        -- the case's number on the page (01, 02, …)
    title      TEXT NOT NULL DEFAULT '',
    summary    TEXT NOT NULL DEFAULT '',
    status     TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  -- THE REVIEW GATE (step 231). The owner confirms ONCE that he read the cases and the AI understood him;
  -- we store WHAT he confirmed (a hash of the case set). Any later edit/add/delete changes the hash → the
  -- confirmation is stale → the next development step asks for it again. This is the "AI and human agree"
  -- checkpoint of the Development Steps pipeline.
  CREATE TABLE IF NOT EXISTS automation_use_cases_review (
    automation    TEXT PRIMARY KEY NOT NULL,
    reviewed_at   TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_hash TEXT NOT NULL DEFAULT ''
  );
  -- The Quiz's PHASE (step 231) — 'usecases' (collect the scenarios first) → 'nodes' (design the nodes).
  -- A SEPARATE table on purpose: automation_quiz already exists on live servers, and a live DB never gains a
  -- column (CREATE TABLE IF NOT EXISTS does not alter, and the makeLocalDb ALTER path does not run on the
  -- data service — the "no column named subject" lesson, step 225 G4).
  CREATE TABLE IF NOT EXISTS automation_quiz_phase (
    quiz_id    TEXT PRIMARY KEY NOT NULL,
    phase      TEXT NOT NULL DEFAULT 'usecases',  -- usecases | nodes
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
  -- UNIVERSAL ENTITY TRANSPORT + HISTORY (step 238) — every entity in an automation's architecture (node,
  -- edge, usecase, chain, dashboard, analytics, calendar, map, processes) carries a TRANSPORT slot (the
  -- current, not-yet-developed brief — cleared once a Development Step consumes it) and a HISTORY log
  -- (append-only, every past consumed brief, never cleared). Generalizes the exact shape
  -- automation_node_versions/automation_edge_versions already used (JSON-blob payload, arbitrary per row) —
  -- same technique as dashboard_rows/automation_entities so no live-server ALTER is ever needed (lesson 225
  -- G4) when a new entity_type is added. entity_ref is the instance id within that type (node cuid, use-case
  -- cuid...); '' (empty string, NOT NULL — SQLite's UNIQUE treats every NULL as distinct, which would
  -- silently allow duplicate rows) for automation-wide entities (chain, dashboard, analytics, calendar,
  -- map, processes).
  CREATE TABLE IF NOT EXISTS entity_transport (
    id           TEXT PRIMARY KEY NOT NULL,
    automation   TEXT NOT NULL,
    entity_type  TEXT NOT NULL,
    entity_ref   TEXT NOT NULL DEFAULT '',
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(automation, entity_type, entity_ref)
  );
  CREATE TABLE IF NOT EXISTS entity_history (
    id           TEXT PRIMARY KEY NOT NULL,
    automation   TEXT NOT NULL,
    entity_type  TEXT NOT NULL,
    entity_ref   TEXT NOT NULL DEFAULT '',
    version      INTEGER NOT NULL,
    payload_json TEXT NOT NULL DEFAULT '{}',
    dev_step_ref TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(automation, entity_type, entity_ref, version)
  );
  -- THE WAVE-BANNER SNOOZE (step 241 E3.3, owner's "Postpone launch") — one row per automation, holding a
  -- SIGNATURE of the staged requirements at the moment the owner postponed the banner. The banner stays
  -- hidden only while the current staged state still hashes to this same signature; the instant ANY entity's
  -- requirement changes, the signature no longer matches and the banner returns on its own. Storing a
  -- signature (not a boolean) is what makes "hidden until you change something" true without a second signal.
  CREATE TABLE IF NOT EXISTS wave_snooze (
    automation TEXT PRIMARY KEY NOT NULL,
    signature  TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
  // automation_quiz.subject / subject_ref (step 225 G4 — the Quiz also brainstorms an EDGE of the global
  // canvas, not only a project) — live DBs (a quiz row already saved) get them via ALTER.
  const aqCols = new Set(
    (sqlite.prepare('PRAGMA table_info(automation_quiz)').all() as Array<{ name: string }>).map(c => c.name)
  )
  if (aqCols.size && !aqCols.has('subject'))     safeAddColumn(sqlite, `ALTER TABLE automation_quiz ADD COLUMN subject     TEXT NOT NULL DEFAULT 'project'`)
  if (aqCols.size && !aqCols.has('subject_ref')) safeAddColumn(sqlite, `ALTER TABLE automation_quiz ADD COLUMN subject_ref TEXT`)
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
