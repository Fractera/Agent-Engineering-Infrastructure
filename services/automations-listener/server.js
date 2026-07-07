// Fractera automations listener (fractera-automations) — the @fractera_auto receiver.
//
// Substrate-level runtime input for the Projects layer (step 200/201, agent-channel-routing.md).
// One file, no build step, ZERO npm dependencies (Node 18+ builtins only): like fractera-cron it
// lives in the SUBSTRATE, survives a slot swap, and idles when nothing is configured.
//
// WHY IT EXISTS: a single Telegram bot polled by the Hermes gateway eats every message (getUpdates
// hands each update to exactly ONE consumer), so no automation was ever reached. This service polls
// a SEPARATE "automations" bot (@fractera_auto), so the Hermes chat bot and the automations runtime
// never contend for the same updates. Routing is DETERMINISTIC: a message is matched against the
// GLOBAL project_hooks registry (a unique normalized phrase → exactly one { project, action }) — a
// table lookup, NOT an LLM guess. On a match it POSTs the owning automation's /run route with the
// message as input; the automation itself does the work and replies via the same bot.
//
// Self-sufficiency: no Hermes dependency. When AUTOMATIONS_BOT_TOKEN is absent the service is inert
// (logs once, idles) — a project without the automations bot configured simply receives nothing.
//
// Config: services/automations-listener/.env (written by bootstrap; parsed here, no dotenv).
//   AUTOMATIONS_BOT_TOKEN  the @fractera_auto bot token (DISTINCT from the Hermes chat bot token)
//   DATA_URL / DATA_SECRET the data service (:3300) — hooks are read through it (no native modules)
//   APP_URL                the Shell (:3000) — the automations' /run routes live here
//   POLL_TIMEOUT_S         getUpdates long-poll timeout (seconds)

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Config (services/automations-listener/.env — written by bootstrap; parsed here, no dotenv) ──

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

const BOT_TOKEN     = (env('AUTOMATIONS_BOT_TOKEN') ?? '').trim()
const DATA_URL      = env('DATA_URL') ?? 'http://127.0.0.1:3300'
const DATA_SECRET   = env('DATA_SECRET') ?? ''
const APP_URL       = env('APP_URL') ?? 'http://127.0.0.1:3000'
const POLL_TIMEOUT_S = Number(env('POLL_TIMEOUT_S') ?? 25)
const HOOKS_TTL_MS  = Number(env('HOOKS_TTL_MS') ?? 15000)
const API           = `https://api.telegram.org/bot${BOT_TOKEN}`

// ── Phrase normalization — MUST byte-match the slot's lib/hooks/normalize.ts (step 187), or a
// stored hook will never be found. Lowercase, strip non-letter/digit (Unicode-aware), collapse ws.
function normalizePhrase(phrase) {
  return (phrase ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Data service client (same trusted path fractera-cron uses; returns rows for a SELECT) ───────
async function dataQuery(sql, params = []) {
  const r = await fetch(`${DATA_URL}/db/migrate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-data-secret': DATA_SECRET,
      'x-agent-identity': 'fractera-automations',
    },
    body: JSON.stringify(params.length ? { sql, params } : { sql }),
  })
  const body = await r.json().catch(() => ({}))
  if (!r.ok || body.error) throw new Error(body.error ?? `data service HTTP ${r.status}`)
  return Array.isArray(body.rows) ? body.rows : []
}

// ── Hook registry (cached; refreshed on a short TTL so a newly-added hook is picked up fast) ─────
let hooksCache = { at: 0, rows: [] }
async function loadHooks() {
  if (Date.now() - hooksCache.at < HOOKS_TTL_MS) return hooksCache.rows
  const rows = await dataQuery(
    `SELECT category, project, action, normalized_phrase FROM project_hooks`,
  )
  // Longest phrase first: if two hooks are prefixes of each other, the more specific wins.
  rows.sort((a, b) => (b.normalized_phrase?.length ?? 0) - (a.normalized_phrase?.length ?? 0))
  hooksCache = { at: Date.now(), rows }
  return rows
}

// ── Deterministic match: the message is "<hook phrase> <payload>". A hook matches when the
// normalized message EQUALS the normalized hook, or STARTS WITH it followed by a space. No LLM.
function matchHook(text, hooks) {
  const norm = normalizePhrase(text)
  if (!norm) return null
  for (const h of hooks) {
    const hp = (h.normalized_phrase ?? '').trim()
    if (!hp) continue
    if (norm === hp || norm.startsWith(hp + ' ')) {
      return { category: h.category, project: h.project, action: h.action, phrase: hp }
    }
  }
  return null
}

// ── Dispatch: POST the owning automation's /run with the message as input (a STRING — the run
// route forwards input as a string; the automation's reception step reads it). Same shape the
// cron pub/sub dispatcher already uses. The automation itself replies via the bot; we do not.
async function dispatch(match, message) {
  const url = `${APP_URL}/api/projects/${match.category}/${match.project}/run`
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-agent-identity': 'fractera-automations' },
      body: JSON.stringify({ input: JSON.stringify({
        source: 'telegram', chatId: message.chat?.id, messageId: message.message_id,
        text: message.text, date: message.date, action: match.action,
      }) }),
      signal: AbortSignal.timeout(30000),
    })
    console.log(`[auto] '${match.phrase}' -> ${match.category}/${match.project} (${match.action}) /run: HTTP ${r.status}`)
  } catch (e) {
    console.error(`[auto] dispatch to ${match.category}/${match.project} failed: ${e.message ?? e}`)
  }
}

// ── Telegram long-poll (getUpdates). In-memory offset: once an update is acked (offset=last+1)
// Telegram drops it server-side, so a restart never reprocesses an acked update. ───────────────
let offset = 0

async function pollOnce() {
  const r = await fetch(`${API}/getUpdates?timeout=${POLL_TIMEOUT_S}&offset=${offset}&allowed_updates=["message"]`, {
    signal: AbortSignal.timeout((POLL_TIMEOUT_S + 10) * 1000),
  })
  const body = await r.json().catch(() => ({}))
  if (!body?.ok) {
    // 409 = another consumer is polling this same bot (must not happen — the automations bot is
    // dedicated). Surface it loudly; it is exactly the two-consumer collision this service prevents.
    throw new Error(body?.description ?? `getUpdates HTTP ${r.status}`)
  }
  const updates = Array.isArray(body.result) ? body.result : []
  if (!updates.length) return
  const hooks = await loadHooks()
  for (const u of updates) {
    offset = Math.max(offset, u.update_id + 1)
    const msg = u.message
    const text = typeof msg?.text === 'string' ? msg.text : ''
    if (!text) continue
    const match = matchHook(text, hooks)
    if (match) await dispatch(match, msg)
    else console.log(`[auto] no registered hook in message — ignored`)
  }
}

async function loop() {
  for (;;) {
    try {
      await pollOnce()
    } catch (e) {
      console.error(`[auto] poll error: ${e.message ?? e}`)
      await new Promise(res => setTimeout(res, 5000)) // back off on error, then retry
    }
  }
}

process.on('uncaughtException', e => console.error(`[auto] uncaught: ${e.stack ?? e}`))
process.on('unhandledRejection', e => console.error(`[auto] unhandled rejection: ${e}`))

if (!BOT_TOKEN) {
  // Inert-until-configured: no automations bot → nothing to receive. Idle so PM2 keeps the process
  // green without crashing (mirrors the graph's "inert when keys are absent").
  console.log('[auto] fractera-automations idle — AUTOMATIONS_BOT_TOKEN not set (inert until configured)')
  setInterval(() => {}, 1 << 30)
} else {
  console.log(`[auto] fractera-automations up — app=${APP_URL} data=${DATA_URL} poll=${POLL_TIMEOUT_S}s`)
  loop()
}
