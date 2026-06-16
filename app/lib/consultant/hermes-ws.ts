import { WebSocket } from 'undici'
import {
  parseClientActionEnvelope,
  validateActionArgs,
  defaultActionLabel,
  isClientActionName,
  type ClientAction,
} from './client-actions'

// WS transport to the public Hermes process (loopback). Contract pinned from source
// (tui_gateway/server.py + ws.py + hermes_cli/web_server.py — see next-step C1):
//   ws://host/api/ws?token=<HERMES_DASHBOARD_SESSION_TOKEN>  — newline-delimited JSON-RPC
//   on connect → event gateway.ready · session.create → result.session_id ·
//   prompt.submit {session_id, text} · events {method:"event", params:{type,…}}:
//   message.delta {text} (accumulate) · message.complete · tool.complete {name, result}
//   (result already json.loads'd → our client-action envelope for execution:"client" tools).
// undici's WebSocket is used so no extra dependency is needed (bundled with Node/Next).

export type HermesTurn = {
  sessionId: string | null
  text: string
  actions: ClientAction[]
  keyError?: boolean
  authRequired?: { kind: 'personal' | 'role' }
}

type Rpc = { jsonrpc?: string; id?: number; method?: string; params?: Record<string, unknown>; result?: Record<string, unknown>; error?: unknown }

const CONNECT_TIMEOUT = 8000
const TURN_HARD_CAP = 45000
const QUIET_AFTER_COMPLETE = 1500

function safeParse(s: string): Record<string, unknown> | null {
  try { const j = JSON.parse(s); return j && typeof j === 'object' ? j : null } catch { return null }
}

function looksLikeKeyError(e: unknown): boolean {
  const m = JSON.stringify(e ?? '').toLowerCase()
  return ['api key', 'apikey', 'no credential', 'credential', 'quota', 'insufficient', '401', 'unauthorized', 'init failed'].some((s) => m.includes(s))
}

export function runConsultantTurn(opts: {
  url: string
  token: string
  message: string
  sessionId?: string | null
}): Promise<HermesTurn> {
  const wsUrl = `${opts.url.replace(/^http/, 'ws').replace(/\/$/, '')}/api/ws?token=${encodeURIComponent(opts.token)}`
  return new Promise<HermesTurn>((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    let sessionId = opts.sessionId ?? null
    let text = ''
    const actions: ClientAction[] = []
    let keyError = false
    let authRequired: { kind: 'personal' | 'role' } | undefined
    let nextId = 1
    let started = false
    let actionSeq = 0
    let quietTimer: ReturnType<typeof setTimeout> | null = null
    let done = false

    const hardTimer = setTimeout(finish, TURN_HARD_CAP)
    const connectTimer = setTimeout(() => {
      try { ws.close() } catch { /* ignore */ }
      if (!done) { done = true; reject(new Error('hermes ws connect timeout')) }
    }, CONNECT_TIMEOUT)

    function finish() {
      if (done) return
      done = true
      clearTimeout(hardTimer)
      clearTimeout(connectTimer)
      if (quietTimer) clearTimeout(quietTimer)
      try { ws.close() } catch { /* ignore */ }
      resolve({ sessionId, text: text.trim(), actions, keyError: keyError || undefined, authRequired })
    }
    function armQuiet() {
      if (quietTimer) clearTimeout(quietTimer)
      quietTimer = setTimeout(finish, QUIET_AFTER_COMPLETE)
    }
    function send(method: string, params: Record<string, unknown>) {
      ws.send(`${JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params })}\n`)
    }
    function startTurn() {
      if (started) return
      started = true
      if (sessionId) send('prompt.submit', { session_id: sessionId, text: opts.message })
      else send('session.create', {})
    }

    ws.addEventListener('open', () => clearTimeout(connectTimer))
    ws.addEventListener('error', () => finish())
    ws.addEventListener('close', () => finish())
    ws.addEventListener('message', (ev: { data: unknown }) => {
      const raw = typeof ev.data === 'string' ? ev.data : String(ev.data)
      for (const line of raw.split('\n')) {
        const s = line.trim()
        if (!s) continue
        let msg: Rpc
        try { msg = JSON.parse(s) } catch { continue }
        handle(msg)
      }
    })

    function handle(msg: Rpc) {
      if (msg.method === 'event' && msg.params) {
        const type = msg.params.type as string
        if (type === 'gateway.ready') return startTurn()
        if (type === 'message.delta' && typeof msg.params.text === 'string') { text += msg.params.text; return }
        if (type === 'message.complete') { armQuiet(); return }
        if (type === 'error') { if (looksLikeKeyError(msg.params)) keyError = true; return }
        if (type === 'tool.complete') { collectAction(msg.params); return }
        return
      }
      if (typeof msg.id !== 'undefined') {
        if (msg.error) { if (looksLikeKeyError(msg.error)) keyError = true; return }
        const sid = msg.result?.session_id
        if (typeof sid === 'string' && !sessionId) {
          sessionId = sid
          send('prompt.submit', { session_id: sid, text: opts.message })
        }
      }
    }

    function collectAction(params: Record<string, unknown>) {
      const result = params.result
      // Auth-request signal (R6) — distinct envelope, surfaced as authRequired{kind}.
      const obj = typeof result === 'string' ? safeParse(result) : (result as Record<string, unknown> | null)
      if (obj && obj.__auth_required__ === true) {
        authRequired = { kind: obj.kind === 'personal' ? 'personal' : 'role' }
        return
      }
      const env =
        typeof result === 'string'
          ? parseClientActionEnvelope(result)
          : result && (result as { __client_action__?: unknown }).__client_action__ === true
            ? { __client_action__: true as const, tool: String((result as { tool?: unknown }).tool ?? ''), args: ((result as { args?: Record<string, unknown> }).args ?? {}) }
            : null
      if (!env || !isClientActionName(env.tool)) return
      const v = validateActionArgs(env.tool, env.args ?? {})
      if (v.ok) actions.push({ id: `a${++actionSeq}`, tool: env.tool, args: v.args, label: defaultActionLabel(env.tool, v.args) })
    }
  })
}
