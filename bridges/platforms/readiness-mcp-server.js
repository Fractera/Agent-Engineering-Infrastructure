import { createServer } from 'http'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { execFile } from 'child_process'

// ── Readiness MCP server (L2, port 3216) ────────────────────────────────────
// Singleton MCP server (not platform-bound) that gives Hermes ONE snapshot of
// all 5 coding agents' readiness before it delegates a task. Closes the blind
// spot where Hermes delegated to a sleeping / logged-out agent (a task into the
// void). The MCP returns FACTS only — which agent to pick is the Hermes skill
// `choose-agent.md`, deliberately not encoded here. → ARCHITECTURE §3.10.
//
// Per agent it reports: installed · logged_in · busy · last_worked_{at,page,step}.
// All probes are cheap and DO NOT wake the agent or spend tokens:
//   logged_in — `claude auth status` for Claude, cached-credential presence for
//               the rest (the "accurate outside request").
//   busy      — reuses each platform bridge's `get_status` over loopback.
//   last_*    — newest deployment_records row for that platform (data service).
// v1 = reliable facts only; context-window % is deferred (CLIs don't expose it).
//
// This is an L2 Hermes-side MCP — separate from the L1 claude.ai deploy MCP. Do
// not conflate.

function textResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] }
}

function toolsSchema() {
  return [
    {
      name: 'check_agents_readiness',
      description:
        'Snapshot the readiness of ALL 5 coding agents (claude-code, codex, gemini-cli, qwen-code, ' +
        'kimi-code) in ONE call, so you know who to delegate to BEFORE you hand out work. For each ' +
        'agent it returns: installed (binary present), logged_in (subscription signed in — a logged-out ' +
        'agent cannot run, the task would go into the void), busy (a task is running right now), and ' +
        'last_worked_at / last_worked_page / last_worked_step (its most recent deployment — a "warm" ' +
        'agent that just worked the same page keeps cache and is cheaper to continue). Probes are cheap ' +
        'and do NOT wake the agents or spend tokens. Call this before delegate_to_platform.',
      inputSchema: { type: 'object', properties: {} },
    },
  ]
}

// logged_in for Claude — authoritative via `claude auth status` (JSON {email}).
function claudeLoggedIn(bin) {
  return new Promise((resolve) => {
    execFile(bin, ['auth', 'status'], { timeout: 5000 }, (err, stdout) => {
      if (err) return resolve(false)
      try { resolve(!!JSON.parse(String(stdout)).email) } catch { resolve(false) }
    })
  })
}

// logged_in for the others — presence of the cached OAuth credential on disk.
function credLoggedIn(home, login) {
  try {
    if (login.kind === 'dir') return readdirSync(join(home, login.path)).length > 0
    return (login.paths ?? []).some((p) => existsSync(join(home, p)))
  } catch { return false }
}

function probeLogin(agent, home) {
  if (agent.login.kind === 'claude-cmd') return claudeLoggedIn(agent.bin)
  return Promise.resolve(credLoggedIn(home, agent.login))
}

// busy — reuse the platform bridge's own get_status over loopback JSON-RPC.
// Returns null if the probe itself failed (unknown), not false.
async function probeBusy(port, secret) {
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (secret) headers['Authorization'] = `Bearer ${secret}`
    const res = await fetch(`http://127.0.0.1:${port}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_status', arguments: {} } }),
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = data?.result?.content?.[0]?.text
    return text ? !!JSON.parse(text).busy : null
  } catch { return null }
}

// last_worked — newest deployment_records row for this platform. SELECT * so a
// missing `step` column on an old DB never breaks the query (db-table-sync).
async function lastWorked(platform, dataUrl, dataSecret) {
  try {
    const headers = { 'Content-Type': 'application/json', 'X-Agent-Identity': 'hermes' }
    if (dataSecret) headers['X-Data-Secret'] = dataSecret
    const res = await fetch(`${dataUrl}/db/migrate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sql: 'SELECT * FROM deployment_records WHERE platform = ? ORDER BY created_at DESC LIMIT 1',
        params: [platform],
      }),
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return null
    const row = ((await res.json()).rows ?? [])[0]
    if (!row) return null
    return { at: row.created_at ?? null, page: row.page_url ?? null, step: row.step ?? null }
  } catch { return null }
}

async function snapshotAgent(agent, ctx) {
  const [logged_in, busy, last] = await Promise.all([
    probeLogin(agent, ctx.home),
    probeBusy(agent.mcpPort, ctx.secret),
    lastWorked(agent.platform, ctx.dataUrl, ctx.dataSecret),
  ])
  return {
    platform:         agent.platform,
    installed:        existsSync(agent.bin),
    logged_in,
    busy,
    last_worked_at:   last?.at ?? null,
    last_worked_page: last?.page ?? null,
    last_worked_step: last?.step ?? null,
  }
}

export class ReadinessMcpServer {
  constructor({ port, secret, home, dataUrl, dataSecret, agents }) {
    this.port = port
    this.secret = secret
    this.ctx = { home, secret, dataUrl, dataSecret }
    this.agents = agents
  }

  start() {
    const server = createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Access-Control-Allow-Origin', '*')

      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

      if (this.secret) {
        const auth = req.headers['authorization'] ?? ''
        if (!auth.startsWith('Bearer ') || auth.slice(7) !== this.secret) {
          res.writeHead(401); res.end(JSON.stringify({ error: 'Unauthorized' })); return
        }
      }

      if (req.method === 'GET' && req.url === '/health') {
        res.end(JSON.stringify({ ok: true, server: 'readiness' })); return
      }

      if (req.method !== 'POST') {
        res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return
      }

      let body = ''
      req.on('data', c => { body += c })
      req.on('end', () => {
        try { this._handle(JSON.parse(body), res) }
        catch { res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' })) }
      })
    })

    server.listen(this.port, '127.0.0.1', () =>
      console.log(`[mcp:readiness] http://127.0.0.1:${this.port}`)
    )
  }

  _handle(rpc, res) {
    const { id, method, params } = rpc
    const ok   = r => res.end(JSON.stringify({ jsonrpc: '2.0', id, result: r }))
    const fail = (c, m) => res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: c, message: m } }))

    if (method === 'tools/list') return ok({ tools: toolsSchema() })
    if (method === 'tools/call') return this._call(params?.name, params?.arguments ?? {}).then(ok).catch(e => fail(-32603, e.message))
    fail(-32601, `Method not found: ${method}`)
  }

  async _call(name) {
    if (name !== 'check_agents_readiness') throw new Error(`Unknown tool: ${name}`)
    const agents = await Promise.all(this.agents.map(a => snapshotAgent(a, this.ctx)))
    return textResult({ agents, checked_at: new Date().toISOString() })
  }
}
