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
//     APP_URL          the Shell (:3000) — the automations' /run routes live here
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

const APP_URL        = env('APP_URL') ?? 'http://127.0.0.1:3000'
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
async function dispatch(entry, message) {
  const url = `${APP_URL}/api/projects/${entry.category}/${entry.project}/run`
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-agent-identity': 'fractera-automations' },
      body: JSON.stringify({ input: JSON.stringify({
        source: 'telegram', chatId: message.chat?.id, messageId: message.message_id,
        text: message.text, date: message.date,
      }) }),
      signal: AbortSignal.timeout(30000),
    })
    console.log(`[auto] ${entry.category}/${entry.project} <- msg ${message.message_id}: /run HTTP ${r.status}`)
  } catch (e) {
    console.error(`[auto] dispatch to ${entry.category}/${entry.project} failed: ${e.message ?? e}`)
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
      const r = await fetch(`${API}/getUpdates?timeout=${POLL_TIMEOUT_S}&offset=${offset}&allowed_updates=["message"]`, {
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
        const msg = u.message
        const text = typeof msg?.text === 'string' ? msg.text : ''
        if (!text) continue
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
