// Fractera automations listener (fractera-automations) — the MULTI-BOT receiver (step 205).
//
// Substrate-level runtime input for the Projects layer (agent-channel-routing.md). One file, no build
// step, ZERO npm dependencies (Node 18+ builtins only): like fractera-cron it lives in the SUBSTRATE,
// survives a slot swap, and idles when nothing is configured.
//
// WHY IT EXISTS: one Telegram bot polled by two consumers eats every message (getUpdates hands each
// update to exactly ONE consumer). Step 205 makes routing deterministic by CHANNEL: each automation
// has its OWN bot, so the bot identity ALREADY selects the automation — there is NO hook matching and
// NO project_hooks lookup here. For each bot in the registry we hold an independent getUpdates
// long-poll and FORWARD every message to that automation's /run. The automation itself classifies the
// action and replies via the same bot.
//
// Self-sufficiency: no Hermes dependency. When the registry is empty (no automation has connected a
// bot) the service is inert — it just reconciles an empty set and idles.
//
// Config:
//   registry.json (this dir) — [{ "category": "...", "project": "...", "token": "<bot token>" }]
//                              (written by the connect modal's config route, step 205.7)
//   services/automations-listener/.env (optional overrides, parsed here, no dotenv):
//     APP_URL          fractera-projects (:3003) — the automations' /run routes live here (step 197; was :3000 shell)
//     POLL_TIMEOUT_S   getUpdates long-poll timeout (seconds)
//     REGISTRY_TTL_MS  how often the registry file is re-read (a newly connected bot starts polling
//                      without a service restart)

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Config (services/automations-listener/.env — optional overrides; parsed here, no dotenv) ──
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

const APP_URL        = env('APP_URL') ?? 'http://127.0.0.1:3003' // fractera-projects — automations' /run routes moved here (step 197; was :3000 shell)
const POLL_TIMEOUT_S = Number(env('POLL_TIMEOUT_S') ?? 25)
const REGISTRY_PATH  = resolve(__dirname, 'registry.json')
const REGISTRY_TTL_MS = Number(env('REGISTRY_TTL_MS') ?? 15000)

// ── Registry: [{ category, project, token }] — the single source of truth for which bot serves which
// automation. Written by the connect modal (205.7); read here on a short interval so a newly connected
// bot begins polling without a restart. Malformed/missing → empty (inert).
function loadRegistry() {
  try {
    if (!existsSync(REGISTRY_PATH)) return []
    const raw = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'))
    if (!Array.isArray(raw)) return []
    return raw.filter(e => e && typeof e.token === 'string' && e.token && e.category && e.project)
  } catch (e) {
    console.error(`[auto] registry parse error: ${e.message ?? e}`)
    return []
  }
}

// ── Dispatch: FORWARD the message to the owning automation's /run with the message as input (a JSON
// string envelope; the automation's reception step reads it). No matching — the bot already selected
// the automation. The automation replies via its own bot; we do not.

// THE AGENT GATE (263.1): a ROUTE-V3 automation's run door authorizes by cookie OR the per-server
// agent-gate secret — `x-agent-identity` is NOT accepted, so in secure mode the forward got 403.
// Same fix as fractera-cron: present the secret, read fresh per call, omit when absent (IP mode).
const PROJECTS_DIR_FOR_GATE = env('PROJECTS_DIR') ?? '/opt/fractera/projects-app'
function agentGateHeader() {
  try {
    const s = readFileSync(resolve(PROJECTS_DIR_FOR_GATE, 'project-config', 'agent-gate-secret'), 'utf8').trim()
    return s ? { 'x-fractera-agent-gate': s } : {}
  } catch { return {} }
}

// ROUTE-V3 (263.1): a v3 automation's run door lives IN THE ROUTE — /projects/<cat>/<proj>/api/run —
// while pre-v3 automations (telegram-notes) keep the platform path /api/projects/<cat>/<proj>/run.
// Try the v3 door first; on 404 fall back to the legacy path. The winning URL is remembered per
// automation so the extra probe happens once, and forgotten on failure so a migration re-probes.
const runUrlCache = new Map()
// The v3 door takes `input` as an OBJECT (the executor's context bag) and additionally receives the RAW
// Telegram update under `update` — a v3 telegram input node declares paramsIn {update} and parses it
// itself. The legacy door keeps the original JSON-STRING envelope (telegram-notes' reception contract).
async function postRun(entry, envelope, rawUpdate) {
  const key = `${entry.category}/${entry.project}`
  const v3 = `${APP_URL}/projects/${entry.category}/${entry.project}/api/run`
  const legacy = `${APP_URL}/api/projects/${entry.category}/${entry.project}/run`
  const candidates = runUrlCache.has(key) ? [runUrlCache.get(key)] : [v3, legacy]
  for (const url of candidates) {
    const body = url.includes('/api/run')
      ? { input: { ...envelope, update: rawUpdate } }
      : { input: JSON.stringify(envelope) }
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-agent-identity': 'fractera-automations', ...agentGateHeader() },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })
    if (r.status === 404 && candidates.length > 1) continue
    if (r.ok) runUrlCache.set(key, url)
    else runUrlCache.delete(key)
    return { r, url }
  }
  runUrlCache.delete(key)
  return { r: { status: 404, ok: false }, url: legacy }
}

async function dispatch(entry, message) {
  try {
    const { r, url } = await postRun(entry, {
      source: 'telegram', chatId: message.chat?.id, messageId: message.message_id,
      text: message.text ?? message.caption ?? '', date: message.date,
      // Photo (step 205 §E, receipt digitization): forward the largest PhotoSize's file_id so the
      // automation can fetch + digitize it. Telegram sends the array smallest→largest.
      photoFileId: Array.isArray(message.photo) && message.photo.length
        ? message.photo[message.photo.length - 1].file_id : undefined,
      // Location (step 207.20, geo-mark registry): a shared location / venue carries coordinates —
      // the ONLY geo source (Bot API strips EXIF/GPS from photos). venue.title = the place name.
      location: message.location
        ? { lat: message.location.latitude, lng: message.location.longitude,
            title: message.venue?.title ?? '' }
        : undefined,
    }, { message })
    console.log(`[auto] ${entry.category}/${entry.project} <- msg ${message.message_id}: ${url} HTTP ${r.status}`)
  } catch (e) {
    console.error(`[auto] dispatch to ${entry.category}/${entry.project} failed: ${e.message ?? e}`)
  }
}

// ── Callback dispatch (step 205 §D): an inline-button tap. Forward it as a callback envelope so the
// automation can resolve the pending message + forced action and act on it (it also acks the tap).
async function dispatchCallback(entry, cb) {
  try {
    const { r, url } = await postRun(entry, {
      source: 'telegram', kind: 'callback', data: cb.data,
      chatId: cb.message?.chat?.id, callbackQueryId: cb.id, messageId: cb.message?.message_id,
    }, { callback_query: cb })
    console.log(`[auto] ${entry.category}/${entry.project} <- callback '${cb.data}': ${url} HTTP ${r.status}`)
  } catch (e) {
    console.error(`[auto] callback dispatch to ${entry.category}/${entry.project} failed: ${e.message ?? e}`)
  }
}

// ── One long-poll loop per bot token. In-memory offset per bot: once an update is acked (offset=last+1)
// Telegram drops it, so a restart never reprocesses an acked update. `getEntry` returns the current
// {category,project} (reconcile may update it); `isStopped` ends the loop when the bot leaves the registry.
async function runPoller(token, getEntry, isStopped) {
  const API = `https://api.telegram.org/bot${token}`
  const tag = `${token.slice(0, 8)}…`
  let offset = 0
  console.log(`[auto] poller up for ${getEntry().category}/${getEntry().project} (bot ${tag})`)
  while (!isStopped()) {
    try {
      const r = await fetch(`${API}/getUpdates?timeout=${POLL_TIMEOUT_S}&offset=${offset}&allowed_updates=["message","callback_query"]`, {
        signal: AbortSignal.timeout((POLL_TIMEOUT_S + 10) * 1000),
      })
      const body = await r.json().catch(() => ({}))
      if (!body?.ok) {
        // 409 = a second consumer polls this same bot (must not happen — each bot is dedicated to one
        // automation). Surface it loudly; it is exactly the two-consumer collision this design prevents.
        throw new Error(body?.description ?? `getUpdates HTTP ${r.status}`)
      }
      const updates = Array.isArray(body.result) ? body.result : []
      for (const u of updates) {
        offset = Math.max(offset, u.update_id + 1)
        const cb = u.callback_query
        if (cb && typeof cb.data === 'string') {
          await dispatchCallback(getEntry(), cb)
          continue
        }
        const msg = u.message
        const hasText = typeof msg?.text === 'string' && msg.text
        const hasPhoto = Array.isArray(msg?.photo) && msg.photo.length
        // A shared location/venue is a first-class message too (step 207.20 geo-marks).
        const hasLocation = msg?.location && typeof msg.location.latitude === 'number'
        if (!hasText && !hasPhoto && !hasLocation) continue
        await dispatch(getEntry(), msg)
      }
    } catch (e) {
      console.error(`[auto] poll error (bot ${tag}): ${e.message ?? e}`)
      await new Promise(res => setTimeout(res, 5000)) // back off on error, then retry
    }
  }
  console.log(`[auto] poller stopped (bot ${tag})`)
}

// ── Reconcile the running pollers with the registry: start a poller for each new bot, stop one whose
// token left the registry, and refresh the {category,project} of an existing one. Runs on an interval.
const pollers = new Map() // token -> { stopped, entry }

function reconcile() {
  const wanted = new Map(loadRegistry().map(e => [e.token, e]))
  for (const [token, p] of pollers) {
    if (!wanted.has(token)) { p.stopped = true; pollers.delete(token) }
    else p.entry = wanted.get(token)
  }
  for (const [token, entry] of wanted) {
    if (pollers.has(token)) continue
    const p = { stopped: false, entry }
    pollers.set(token, p)
    runPoller(token, () => p.entry, () => p.stopped)
  }
}

process.on('uncaughtException', e => console.error(`[auto] uncaught: ${e.stack ?? e}`))
process.on('unhandledRejection', e => console.error(`[auto] unhandled rejection: ${e}`))

console.log(`[auto] fractera-automations (multi-bot) up — app=${APP_URL} poll=${POLL_TIMEOUT_S}s registry=${REGISTRY_PATH}`)
reconcile()
setInterval(reconcile, REGISTRY_TTL_MS)
// Keep the process alive even with zero pollers (inert-until-configured).
setInterval(() => {}, 1 << 30)
