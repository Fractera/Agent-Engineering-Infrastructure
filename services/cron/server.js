// Fractera cron runner (fractera-cron) — substrate-level scheduler of the Projects layer.
//
// One file, no build step, ZERO npm dependencies (Node 18+ builtins only): the runner must
// survive a slot swap — it lives in the substrate, scans the SLOT for declarations and simply
// idles when the slot is empty. Declarations are read fresh on every tick, so adding/editing
// a project's cron.json needs NO restart of this process.
//
// Declarations: <slot>/app/(projects)/projects/<category>/<project>/cron.json
//   { "jobs": [ { "id": "publish-daily", "title": "Publish daily article",
//                 "schedule": "0 9 * * *",            // 5-field cron, SERVER LOCAL TIME
//                 "action": { "type": "http", "url": "http://127.0.0.1:3000/api/...",
//                             "method": "POST", "body": { } }
//                        or { "type": "script", "file": "_cron/publish.mjs" },
//                 "enabled": true, "timeoutMs": 600000 } ] }
//
// Journal: tables project_cron_jobs / project_cron_runs in the shared app DB
// (/opt/fractera/app/data/app.db). The runner does NOT open the DB itself — all reads/writes
// go through the data service (:3300) with the trusted agent header x-data-secret, so this
// process needs no native modules and no npm install. The project page (frozen project-page
// primitive, _lib/project-data.ts) reads the same tables to render its two tables.
//
// Overlap protection: while a job's previous run is still in progress the new firing is
// skipped (logged, not journaled). A run result may carry { "resultTitle", "artifactUrl" }
// — from the HTTP response JSON or the script's last stdout line — and lands in the
// project's results table.

import { readdirSync, readFileSync, existsSync, statSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Config (services/cron/.env — written by bootstrap; parsed here, no dotenv) ─────────────

function parseEnvFile(path) {
  const out = {}
  if (!existsSync(path)) return out
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2]
  }
  return out
}

const fileEnv = parseEnvFile(resolve(__dirname, '.env'))
const env = k => process.env[k] ?? fileEnv[k]

const DATA_URL    = env('DATA_URL') ?? 'http://127.0.0.1:3300'
const DATA_SECRET = env('DATA_SECRET') ?? ''
// The Projects layer moved OUT of the app slot (:3000) into its own process fractera-projects
// (:3003) in step 197. cron.json declarations, the integration-key .env.local, and the /run routes
// now all live under the projects app, so this scans and targets projects-app — NOT the slot.
// PROJECTS_DIR (bootstrap .env) points at it; SLOT_DIR is honored as a legacy fallback.
const PROJECTS_DIR = env('PROJECTS_DIR') ?? env('SLOT_DIR') ?? '/opt/fractera/projects-app'
const APP_URL     = env('APP_URL') ?? 'http://127.0.0.1:3003' // fractera-projects — subscribers' /run lives here (step 197; was :3000 shell pre-197)
const TICK_MS     = Number(env('TICK_MS') ?? 15000)
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000
const MAX_TIMEOUT_MS     = 60 * 60 * 1000

// The Projects zone lives in a route group; tolerate both spellings of the mount.
const DECLARATION_ROOTS = [
  join(PROJECTS_DIR, 'app', '(projects)', 'projects'),
  join(PROJECTS_DIR, 'app', 'projects'),
]

// ── Journal schema (kept textually identical to SCHEMA in the slot's lib/db/index.ts) ──────

const DDL = `
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
  -- Inter-automation orchestration (ontology entity 13 + §D pub/sub, step 195). Kept textually
  -- identical to SCHEMA in the slot's lib/db/index.ts. The dispatcher (below) drains
  -- automation_events; subjects + subject_events carry cross-automation state + history.
  CREATE TABLE IF NOT EXISTS subjects (
    id               TEXT PRIMARY KEY NOT NULL,
    kind             TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT '',
    owner_automation TEXT NOT NULL DEFAULT '',
    attributes       TEXT NOT NULL DEFAULT '{}',
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS subject_events (
    id           TEXT PRIMARY KEY NOT NULL,
    subject_id   TEXT NOT NULL,
    event        TEXT NOT NULL,
    from_automation TEXT NOT NULL DEFAULT '',
    payload      TEXT NOT NULL DEFAULT '{}',
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS automation_events (
    id            TEXT PRIMARY KEY NOT NULL,
    event         TEXT NOT NULL,
    subject_id    TEXT NOT NULL DEFAULT '',
    from_automation TEXT NOT NULL DEFAULT '',
    payload       TEXT NOT NULL DEFAULT '{}',
    published_at  TEXT NOT NULL DEFAULT (datetime('now')),
    dispatched    INTEGER NOT NULL DEFAULT 0
  );
`

// ── Data service client ─────────────────────────────────────────────────────────────────────

async function dataMigrate(sql, params = []) {
  const r = await fetch(`${DATA_URL}/db/migrate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-data-secret': DATA_SECRET,
      'x-agent-identity': 'fractera-cron',
    },
    body: JSON.stringify(params.length ? { sql, params } : { sql }),
  })
  const body = await r.json().catch(() => ({}))
  if (!r.ok || body.error) throw new Error(body.error ?? `data service HTTP ${r.status}`)
  return body
}

// SELECT rows through the same endpoint (data service returns rows for a SELECT).
async function dataQuery(sql, params = []) {
  const body = await dataMigrate(sql, params)
  return Array.isArray(body.rows) ? body.rows : []
}

// ── Cron matcher — standard 5-field expressions (minute hour dom month dow) ────────────────
// Supports *, values, ranges (1-5), steps (*/15, 1-30/5), lists (1,15,30). dow: 0 or 7 =
// Sunday. When BOTH dom and dow are restricted, a date matches if EITHER matches (vixie).

function parseField(field, min, max) {
  const values = new Set()
  for (const part of field.split(',')) {
    const m = part.match(/^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/)
    if (!m) return null
    const step = m[2] ? parseInt(m[2], 10) : 1
    if (step < 1) return null
    let lo, hi
    if (m[1] === '*') { lo = min; hi = max }
    else if (m[1].includes('-')) { [lo, hi] = m[1].split('-').map(n => parseInt(n, 10)) }
    else { lo = parseInt(m[1], 10); hi = m[2] ? max : lo }
    if (lo < min || hi > max || lo > hi) return null
    for (let v = lo; v <= hi; v += step) values.add(v)
  }
  return values
}

function parseCron(expr) {
  const parts = String(expr).trim().split(/\s+/)
  if (parts.length !== 5) return null
  const minute = parseField(parts[0], 0, 59)
  const hour   = parseField(parts[1], 0, 23)
  const dom    = parseField(parts[2], 1, 31)
  const month  = parseField(parts[3], 1, 12)
  const dow    = parseField(parts[4].replace(/7/g, '0'), 0, 6)
  if (!minute || !hour || !dom || !month || !dow) return null
  return { minute, hour, dom, month, dow, domAny: parts[2] === '*', dowAny: parts[4] === '*' }
}

function cronMatches(parsed, d) {
  if (!parsed.minute.has(d.getMinutes())) return false
  if (!parsed.hour.has(d.getHours())) return false
  if (!parsed.month.has(d.getMonth() + 1)) return false
  const domOk = parsed.dom.has(d.getDate())
  const dowOk = parsed.dow.has(d.getDay())
  if (!parsed.domAny && !parsed.dowAny) return domOk || dowOk
  return domOk && dowOk
}

// ── Declaration scan (every tick — dynamic re-read, no restart needed) ─────────────────────

function listDirs(path) {
  try {
    return readdirSync(path).filter(name => {
      try { return statSync(join(path, name)).isDirectory() } catch { return false }
    })
  } catch { return [] }
}

function scanDeclarations() {
  const jobs = []
  for (const root of DECLARATION_ROOTS) {
    if (!existsSync(root)) continue
    for (const category of listDirs(root)) {
      for (const project of listDirs(join(root, category))) {
        const file = join(root, category, project, 'cron.json')
        if (!existsSync(file)) continue
        let decl
        try { decl = JSON.parse(readFileSync(file, 'utf8')) }
        catch (e) { console.error(`[cron] invalid JSON in ${file}: ${e.message}`); continue }
        for (const job of Array.isArray(decl?.jobs) ? decl.jobs : []) {
          if (typeof job?.id !== 'string' || !job.id.trim()) continue
          const parsed = parseCron(job.schedule)
          if (!parsed) { console.error(`[cron] bad schedule '${job.schedule}' in ${file}#${job.id}`); continue }
          const type = job?.action?.type
          if (type !== 'http' && type !== 'script') {
            console.error(`[cron] unsupported action type '${type}' in ${file}#${job.id}`); continue
          }
          jobs.push({
            key: `${category}/${project}#${job.id}`,
            category, project,
            jobId: job.id,
            title: typeof job.title === 'string' && job.title.trim() ? job.title : job.id,
            schedule: String(job.schedule),
            parsed,
            action: job.action,
            enabled: job.enabled !== false,
            timeoutMs: Math.min(Number(job.timeoutMs) || DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS),
            projectDir: join(root, category, project),
          })
        }
      }
    }
  }
  return jobs
}

// ── Jobs table sync — cron.json is the source of truth for DECLARATIONS; runs (the journal)
// are never touched by the sync. Only executed when the declaration set actually changed. ──

let lastSyncSignature = null

async function syncJobsTable(jobs) {
  const signature = JSON.stringify(jobs.map(j =>
    [j.key, j.title, j.schedule, JSON.stringify(j.action), j.enabled]))
  if (signature === lastSyncSignature) return
  for (const j of jobs) {
    await dataMigrate(
      `INSERT INTO project_cron_jobs (id, category, project, job_id, title, schedule, action, enabled, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title, schedule = excluded.schedule, action = excluded.action,
         enabled = excluded.enabled, updated_at = excluded.updated_at`,
      [j.key, j.category, j.project, j.jobId, j.title, j.schedule, JSON.stringify(j.action), j.enabled ? 1 : 0],
    )
  }
  if (jobs.length === 0) {
    await dataMigrate(`DELETE FROM project_cron_jobs`)
  } else {
    await dataMigrate(
      `DELETE FROM project_cron_jobs WHERE id NOT IN (${jobs.map(() => '?').join(', ')})`,
      jobs.map(j => j.key),
    )
  }
  lastSyncSignature = signature
  console.log(`[cron] declarations synced: ${jobs.length} job(s)`)
}

// ── Inter-automation pub/sub dispatch (ontology §D, step 195) ─────────────────────────────────
// Mirror of scanDeclarations: read each project's co-located events.json { subscribes: [...] } and
// map an event NAME → the automations whose /run must fire when that event is published. Read fresh
// every tick (no restart to add a subscriber).
function scanSubscriptions() {
  const byEvent = new Map() // eventName -> [{ category, project, runUrl }]
  for (const root of DECLARATION_ROOTS) {
    if (!existsSync(root)) continue
    for (const category of listDirs(root)) {
      for (const project of listDirs(join(root, category))) {
        const file = join(root, category, project, 'events.json')
        if (!existsSync(file)) continue
        let decl
        try { decl = JSON.parse(readFileSync(file, 'utf8')) }
        catch (e) { console.error(`[cron] invalid JSON in ${file}: ${e.message}`); continue }
        const subs = Array.isArray(decl?.subscribes) ? decl.subscribes : []
        for (const ev of subs) {
          if (typeof ev !== 'string' || !ev.trim()) continue
          const runUrl = `${APP_URL}/api/projects/${category}/${project}/run`
          if (!byEvent.has(ev)) byEvent.set(ev, [])
          byEvent.get(ev).push({ category, project, runUrl })
        }
      }
    }
  }
  return byEvent
}

// Drain the automation_events queue: for every undispatched event, POST each subscriber's /run with
// { subjectId, event } (the payload carries only the id — the subscriber reads the subject's CURRENT
// state), then mark the row dispatched. Pub/sub: a publisher never names a target; 0..N subscribers
// may answer. An event with no subscriber is still marked dispatched (delivered to nobody, not stuck).
async function dispatchEvents() {
  const pending = await dataQuery(
    `SELECT id, event, subject_id, from_automation FROM automation_events WHERE dispatched = 0 ORDER BY published_at LIMIT 50`,
  )
  if (!pending.length) return
  const subs = scanSubscriptions()
  for (const row of pending) {
    const targets = subs.get(row.event) ?? []
    for (const t of targets) {
      try {
        const r = await fetch(t.runUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-agent-identity': 'fractera-cron' },
          // input is forwarded by the run route only as a STRING → send the handoff as a JSON string;
          // the subscriber's event step JSON.parses it to read { subjectId, event, from }.
          body: JSON.stringify({ input: JSON.stringify({ subjectId: row.subject_id, event: row.event, from: row.from_automation }) }),
          signal: AbortSignal.timeout(30000),
        })
        console.log(`[cron] event '${row.event}' -> ${t.category}/${t.project} /run: HTTP ${r.status}`)
      } catch (e) {
        console.error(`[cron] event '${row.event}' -> ${t.category}/${t.project} dispatch failed: ${e.message ?? e}`)
      }
    }
    if (!targets.length) console.log(`[cron] event '${row.event}' published — no subscribers`)
    await dataMigrate(`UPDATE automation_events SET dispatched = 1 WHERE id = ?`, [row.id])
  }
}

// ── Actions ─────────────────────────────────────────────────────────────────────────────────

function extractResult(candidate) {
  if (!candidate || typeof candidate !== 'object') return {}
  const title = candidate.resultTitle ?? candidate.title
  const url   = candidate.artifactUrl ?? candidate.url
  return {
    resultTitle: typeof title === 'string' ? title.slice(0, 500) : undefined,
    resultUrl:   typeof url === 'string' ? url.slice(0, 2000) : undefined,
  }
}

async function runHttpAction(job) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), job.timeoutMs)
  try {
    const r = await fetch(job.action.url, {
      method: job.action.method ?? 'POST',
      headers: { 'content-type': 'application/json', 'x-agent-identity': 'fractera-cron' },
      body: job.action.body !== undefined ? JSON.stringify(job.action.body) : undefined,
      signal: controller.signal,
    })
    const text = await r.text()
    let parsed; try { parsed = JSON.parse(text) } catch {}
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}: ${text.slice(0, 500)}` }
    return { ok: true, ...extractResult(parsed) }
  } catch (e) {
    return { ok: false, error: controller.signal.aborted ? `timeout after ${job.timeoutMs}ms` : String(e) }
  } finally {
    clearTimeout(timer)
  }
}

function runScriptAction(job) {
  return new Promise(done => {
    // The script must live inside the project folder — a declaration cannot reach outside it.
    const file = resolve(job.projectDir, job.action.file ?? '')
    if (!file.startsWith(resolve(job.projectDir))) {
      return done({ ok: false, error: `script path escapes the project folder: ${job.action.file}` })
    }
    if (!existsSync(file)) return done({ ok: false, error: `script not found: ${job.action.file}` })
    // Projects-app env (projects-app/.env.local) is passed through so integration keys (step 143)
    // are available to project scripts — it moved with the layer in step 197.
    const slotEnv = parseEnvFile(join(PROJECTS_DIR, '.env.local'))
    const child = spawn(process.execPath, [file], {
      cwd: job.projectDir,
      env: { ...process.env, ...slotEnv },
    })
    let out = '', err = ''
    child.stdout.on('data', d => { out = (out + d).slice(-8192) })
    child.stderr.on('data', d => { err = (err + d).slice(-8192) })
    const timer = setTimeout(() => { try { child.kill('SIGKILL') } catch {} }, job.timeoutMs)
    child.on('error', e => { clearTimeout(timer); done({ ok: false, error: String(e) }) })
    child.on('close', code => {
      clearTimeout(timer)
      if (code !== 0) {
        return done({ ok: false, error: `exit ${code === null ? 'killed (timeout)' : code}: ${(err || out).slice(0, 500)}` })
      }
      const lastLine = out.trim().split('\n').pop() ?? ''
      let parsed; try { parsed = JSON.parse(lastLine) } catch {}
      done({ ok: true, ...extractResult(parsed) })
    })
  })
}

// ── Firing + journal ────────────────────────────────────────────────────────────────────────

const running = new Set()

async function fire(job) {
  if (running.has(job.key)) {
    console.log(`[cron] skip ${job.key} — previous run still in progress`)
    return
  }
  running.add(job.key)
  const runId = randomUUID()
  console.log(`[cron] fire ${job.key} (run ${runId})`)
  try {
    await dataMigrate(
      `INSERT INTO project_cron_runs (id, job_key, category, project, process, status) VALUES (?, ?, ?, ?, ?, 'in-progress')`,
      [runId, job.key, job.category, job.project, job.title],
    )
    const result = job.action.type === 'http' ? await runHttpAction(job) : await runScriptAction(job)
    const status = result.ok ? 'completed' : 'failed'
    await dataMigrate(
      `UPDATE project_cron_runs SET status = ?, finished_at = datetime('now'), result_title = ?, result_url = ?, error = ? WHERE id = ?`,
      [status, result.resultTitle ?? null, result.resultUrl ?? null, result.error ?? null, runId],
    )
    await dataMigrate(
      `UPDATE project_cron_jobs SET last_run_at = datetime('now'), last_status = ? WHERE id = ?`,
      [status, job.key],
    )
    console.log(`[cron] ${job.key} → ${status}${result.error ? `: ${result.error}` : ''}`)
  } catch (e) {
    console.error(`[cron] journal write failed for ${job.key}: ${e.message}`)
  } finally {
    running.delete(job.key)
  }
}

// ── Main loop ───────────────────────────────────────────────────────────────────────────────

let tablesReady = false
const lastFiredMinute = new Map()

// Processes/Gantt timeline (step 230) — recompute all fork schedules, at most once per minute. Zero-dep
// (built-in fetch, Node 18+); if fractera-projects is down it just logs and retries next minute.
let lastScheduleMinute = null
async function scheduleTick(minuteKey) {
  if (lastScheduleMinute === minuteKey) return
  lastScheduleMinute = minuteKey
  try {
    await fetch(`${APP_URL}/api/projects/schedule/tick`, {
      method: 'POST',
      headers: { 'X-Agent-Identity': 'fractera-cron' },
      signal: AbortSignal.timeout(20000),
    })
  } catch (e) {
    console.error(`[cron] schedule tick error: ${e.message}`)
  }
}

async function tick() {
  try {
    if (!tablesReady) {
      await dataMigrate(DDL)
      tablesReady = true
      console.log('[cron] journal tables ready')
    }
    const jobs = scanDeclarations()
    await syncJobsTable(jobs)
    const now = new Date()
    const minuteKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}T${now.getHours()}:${now.getMinutes()}`
    for (const job of jobs) {
      if (!job.enabled) continue
      if (lastFiredMinute.get(job.key) === minuteKey) continue
      if (!cronMatches(job.parsed, now)) continue
      lastFiredMinute.set(job.key, minuteKey)
      fire(job) // deliberately not awaited — one slow job must not delay the others
    }
    // Inter-automation pub/sub (step 195): drain the event queue and fire subscribers' /run.
    await dispatchEvents()
    // Processes/Gantt timeline (step 230): once a MINUTE, ask fractera-projects to recompute every fork
    // schedule, so the timeline shifts as runs finish early/late even with no one watching. Throttled off
    // the 15s cron tick; best-effort, idempotent (a pure projection of instances + runs + node estimates).
    await scheduleTick(minuteKey)
  } catch (e) {
    // Data service may be down (restart window) — log and retry on the next tick.
    console.error(`[cron] tick error: ${e.message}`)
  }
}

process.on('uncaughtException', e => console.error(`[cron] uncaught: ${e.stack ?? e}`))
process.on('unhandledRejection', e => console.error(`[cron] unhandled rejection: ${e}`))

console.log(`[cron] fractera-cron up — projects=${PROJECTS_DIR} app=${APP_URL} data=${DATA_URL} tick=${TICK_MS}ms (schedules use server local time)`)
tick()
setInterval(tick, TICK_MS)
