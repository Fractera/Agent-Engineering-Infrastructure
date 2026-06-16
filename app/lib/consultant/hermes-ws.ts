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
        // Event payloads are nested under params.payload (pinned from the live wire,
        // 2026-06-16): { method:"event", params:{ type, session_id, payload:{...} } }.
        const payload = (msg.params.payload ?? {}) as Record<string, unknown>
        if (type === 'gateway.ready') return startTurn()
        if (type === 'message.delta' && typeof payload.text === 'string') { text += payload.text; return }
        if (type === 'message.complete') {
          // Authoritative final text — use it if deltas were missed.
          if (typeof payload.text === 'string' && payload.text.trim().length > text.trim().length) text = payload.text
          armQuiet(); return
        }
        if (type === 'error') { if (looksLikeKeyError(payload)) keyError = true; return }
        if (type === 'tool.complete') { collectAction(payload); return }
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

    // `payload` here is the event's params.payload. The tool result Hermes reports is wrapped
    // and varies in shape (pinned from the live wire 2026-06-16): for an MCP tool it arrives as
    //   payload.result = { result: "<json envelope string>" }
    // but can also be a plain string, a direct object, or an MCP content array. findEnvelope
    // walks these shapes (bounded depth) and returns our {__client_action__|__auth_required__}.
    function findEnvelope(node: unknown, depth = 0): Record<string, unknown> | null {
      if (depth > 5 || node == null) return null
      if (typeof node === 'string') {
        const o = safeParse(node)
        return o && (o.__client_action__ === true || o.__auth_required__ === true) ? o : null
      }
      if (Array.isArray(node)) {
        for (const it of node) { const e = findEnvelope(it, depth + 1); if (e) return e }
        return null
      }
      if (typeof node === 'object') {
        const o = node as Record<string, unknown>
        if (o.__client_action__ === true || o.__auth_required__ === true) return o
        // Common wrappers: { result }, MCP { content: [{ text }] }, { text }.
        for (const k of ['result', 'content', 'text', 'output']) {
          if (k in o) { const e = findEnvelope(o[k], depth + 1); if (e) return e }
        }
      }
      return null
    }

    function collectAction(payload: Record<string, unknown>) {
      const env = findEnvelope(payload.result)
      if (!env) return
      if (env.__auth_required__ === true) {
        authRequired = { kind: env.kind === 'personal' ? 'personal' : 'role' }
        return
      }
      const tool = String(env.tool ?? '')
      if (!isClientActionName(tool)) return
      const v = validateActionArgs(tool, (env.args as Record<string, unknown>) ?? {})
      if (v.ok) actions.push({ id: `a${++actionSeq}`, tool, args: v.args, label: defaultActionLabel(tool, v.args) })
    }
  })
}
