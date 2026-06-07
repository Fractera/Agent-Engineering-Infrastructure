import { createServer } from 'http'
import { randomUUID } from 'crypto'

// ── Deployments MCP server (L2, port 3215) ──────────────────────────────────
// Singleton MCP server (not platform-bound) that lets Hermes record one row
// per development deployment into the shared app.db `deployment_records` table
// — the admin "Deployments" table (Product Loop). Writes go through the data
// service (:3300) generic endpoints; reads use /db/migrate so rows come back
// newest-first (the generic GET has no ORDER BY).
//
// This is the L2 Hermes-side MCP — entirely separate from the L1 claude.ai
// deployment MCP (fractera-easy-starter/lib/mcp-tools.ts). Do not conflate.

const DATA_URL    = process.env.REMOTE_DATA_URL ?? 'http://localhost:3300'
const DATA_SECRET = process.env.DATA_SECRET ?? ''
const TABLE       = 'deployment_records'

function dataHeaders() {
  const h = { 'Content-Type': 'application/json', 'X-Agent-Identity': 'hermes' }
  if (DATA_SECRET) h['X-Data-Secret'] = DATA_SECRET
  return h
}

function clampResult(v) {
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) return 3
  return Math.min(3, Math.max(1, n))
}

function toolsSchema() {
  return [
    {
      name: 'record_deployment',
      description:
        'Record one development deployment in the Product Loop table after you deploy. ' +
        'Call this once the delegated agent finished and the change is live, then give ' +
        'the user the page_url to review. The user rates it 1-3 stars later in the admin UI ' +
        '(default 3). Pass the `tokens` value returned by delegate_to_platform.',
      inputSchema: {
        type: 'object',
        properties: {
          platform:       { type: 'string',  description: 'Agent that did the work, e.g. "claude-code", "codex".' },
          model:          { type: 'string',  description: 'Model used, e.g. "gpt-5-mini", "claude-opus-4.7".' },
          tokens:         { type: 'number',  description: 'Total tokens the agent spent (from delegate_to_platform).' },
          page_url:       { type: 'string',  description: 'URL of the page where the changes can be reviewed.' },
          commit_message: { type: 'string',  description: 'Short description of what changed.' },
          commit_hash:    { type: 'string',  description: 'Git commit hash, if any.' },
          branch:         { type: 'string',  description: 'Git branch, if any.' },
          project:        { type: 'string',  description: 'Project name (default "default").' },
          status:         { type: 'string',  description: 'ready | building | error (default "ready").' },
          duration_ms:    { type: 'number',  description: 'Build/work duration in milliseconds.' },
          result:         { type: 'number',  description: 'Initial quality rating 1-3 (default 3).' },
        },
        required: ['platform', 'page_url'],
      },
    },
    {
      name: 'list_deployments',
      description: 'List the most recent deployment records (newest first) to review past work.',
      inputSchema: {
        type: 'object',
        properties: { limit: { type: 'number', description: 'Max rows (default 20, max 100).' } },
      },
    },
  ]
}

function textResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] }
}

async function dataMigrate(sql, params = []) {
  const res = await fetch(`${DATA_URL}/db/migrate`, {
    method: 'POST', headers: dataHeaders(), body: JSON.stringify({ sql, params }),
  })
  if (!res.ok) throw new Error(`data service ${res.status}: ${await res.text()}`)
  return res.json()
}

async function recordDeployment(args) {
  if (!args.platform) throw new Error('platform required')
  if (!args.page_url) throw new Error('page_url required')
  const row = {
    id:             randomUUID(),
    result:         clampResult(args.result ?? 3),
    project:        args.project ?? 'default',
    tokens:         Math.max(0, Math.round(Number(args.tokens ?? 0)) || 0),
    platform:       args.platform,
    model:          args.model ?? null,
    page_url:       args.page_url,
    commit_message: args.commit_message ?? null,
    status:         args.status ?? 'ready',
    duration_ms:    args.duration_ms != null ? Math.round(Number(args.duration_ms)) : null,
    commit_hash:    args.commit_hash ?? null,
    branch:         args.branch ?? null,
    author:         args.author ?? 'Hermes',
    created_by:     'hermes@agent',
  }
  const res = await fetch(`${DATA_URL}/db/tables/${TABLE}`, {
    method: 'POST', headers: dataHeaders(), body: JSON.stringify(row),
  })
  if (!res.ok) throw new Error(`data service ${res.status}: ${await res.text()}`)
  return { ok: true, id: row.id }
}

async function listDeployments(args) {
  const limit = Math.min(Math.max(Number(args.limit ?? 20) || 20, 1), 100)
  const data = await dataMigrate(
    `SELECT * FROM ${TABLE} ORDER BY created_at DESC LIMIT ?`, [limit],
  )
  return { rows: data.rows ?? [] }
}

export class DeploymentsMcpServer {
  constructor({ port, secret }) {
    this.port = port
    this.secret = secret
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
        res.end(JSON.stringify({ ok: true, server: 'deployments' })); return
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
      console.log(`[mcp:deployments] http://127.0.0.1:${this.port}`)
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

  async _call(name, args) {
    switch (name) {
      case 'record_deployment': return textResult(await recordDeployment(args))
      case 'list_deployments':  return textResult(await listDeployments(args))
      default: throw new Error(`Unknown tool: ${name}`)
    }
  }
}
