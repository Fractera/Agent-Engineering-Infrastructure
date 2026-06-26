import { createServer } from 'http'
import { readFileSync } from 'fs'
import { handleMcpHandshake } from './mcp-handshake.js'
import { publicSiteUrl } from './site-url.js'

// ── Slot Rebuild / Deploy MCP server (L2, port 3225) ────────────────────────
// Lets any of the 6 agents make file changes VISIBLE by rebuilding the app slot —
// the same "Deploy" action the footer button performs (POST :3002/api/deploy →
// next build + pm2 reload + health check). Without this, an agent that writes
// files (e.g. composes a structure) cannot finish: the slot runs in production
// mode, so changes stay invisible until a rebuild. The owner used to press Deploy
// by hand; this tool lets the agent close the loop itself, with a confirm step.
//
// SCOPE (important): this rebuilds the EXISTING slot on the CURRENT server
// (build + pm2 reload). It is NOT provisioning/wiping/bootstrapping a fresh server
// (that is the L1 install flow, frozen and separate — never touched here). This is
// exactly the "build + reload on the live server" action the platform already
// exposes; the §8.2 confirm makes it "by agreement".
//
// owner_deploy_rebuild_slot — mutating; §8.2 confirm via dry_run. L2 only.

const textResult = data => ({ content: [{ type: 'text', text: JSON.stringify(data) }] })

function toolsSchema() {
  return [
    {
      name: 'owner_deploy_rebuild_slot',
      description:
        'Rebuild the app slot so file changes become visible — the same "Deploy" the footer button runs ' +
        '(next build + pm2 reload + health check). Use this to FINISH any task that wrote files (e.g. after ' +
        'composing a structure): the slot is production-mode, so changes stay invisible until a rebuild. ' +
        'Takes 2-4 minutes; this tool waits for the result and returns the terminal status (COMPLETED / FAILED ' +
        '/ HEALTH_FAILED) with the tail of the build log.\n\n' +
        'CONFIRM FIRST (§8.2): call dry_run=true to tell the owner you will rebuild (~2-4 min) and get their ok, ' +
        'THEN call without dry_run. This rebuilds the EXISTING slot on this server — it does NOT provision or wipe ' +
        'a server. On FAILED, report the log tail; do not retry blindly.',
      inputSchema: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'Short note for the deploy log / Product Loop, e.g. "add news section".' },
          dry_run: { type: 'boolean', description: 'true → confirm intent without rebuilding (§8.2). false/omit → rebuild.' },
        },
      },
    },
  ]
}

export class DeployMcpServer {
  constructor({ port, secret, adminUrl, deploySecretFile, pollTimeoutMs }) {
    this.port = port
    this.secret = secret
    this.adminUrl = adminUrl ?? 'http://127.0.0.1:3002'
    this.deploySecretFile = deploySecretFile ?? '/opt/fractera/bridges/app/.env.local'
    this.pollTimeoutMs = pollTimeoutMs ?? 8 * 60 * 1000 // 8 min ceiling
  }

  start() {
    const server = createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Access-Control-Allow-Origin', '*')
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
      if (this.secret) {
        const auth = req.headers['authorization'] ?? ''
        if (!auth.startsWith('Bearer ') || auth.slice(7) !== this.secret) { res.writeHead(401); res.end(JSON.stringify({ error: 'Unauthorized' })); return }
      }
      if (req.method === 'GET' && req.url === '/health') { res.end(JSON.stringify({ ok: true, server: 'deploy' })); return }
      if (req.method !== 'POST') { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return }
      let body = ''
      req.on('data', c => { body += c })
      req.on('end', () => { try { this._handle(JSON.parse(body), res) } catch { res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' })) } })
    })
    server.listen(this.port, '127.0.0.1', () => console.log(`[mcp:deploy] http://127.0.0.1:${this.port}`))
  }

  _handle(rpc, res) {
    const { id, method, params } = rpc
    const ok = r => res.end(JSON.stringify({ jsonrpc: '2.0', id, result: r }))
    const fail = (c, m) => res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: c, message: m } }))
    if (handleMcpHandshake(rpc, res, 'fractera-deploy-bridge')) return
    if (method === 'tools/list') return ok({ tools: toolsSchema() })
    if (method === 'tools/call') return this._call(params?.name, params?.arguments ?? {}).then(ok).catch(e => fail(-32603, e.message))
    fail(-32601, `Method not found: ${method}`)
  }

  async _call(name, args) {
    if (name === 'owner_deploy_rebuild_slot') return this._rebuild(args)
    throw new Error(`Unknown tool: ${name}`)
  }

  // Read DEPLOY_SECRET from the admin's .env.local (sanctioned platform exception —
  // a read-only secret used to trigger the slot rebuild, same as the deploy pipeline).
  _deploySecret() {
    try {
      for (const line of readFileSync(this.deploySecretFile, 'utf8').split('\n')) {
        const m = /^\s*(?:export\s+)?DEPLOY_SECRET\s*=\s*(.+)\s*$/.exec(line)
        if (m) return m[1].trim().replace(/^["']|["']$/g, '')
      }
    } catch { /* fall through */ }
    return ''
  }

  async _rebuild(args) {
    const description = (typeof args.description === 'string' && args.description.trim()) ? args.description.trim() : 'agent rebuild'

    if (args.dry_run) {
      return textResult({
        preview: true,
        action: 'rebuild the app slot (next build + pm2 reload + health check)',
        eta: '~2-4 minutes',
        scope: 'rebuilds the EXISTING slot on this server; does NOT provision/wipe a server',
        confirm_prompt: `Пересоберу приложение (~2-4 мин), чтобы изменения стали видны: «${description}». Повторите вызов без dry_run для подтверждения.`,
      })
    }

    const secret = this._deploySecret()
    if (!secret) throw new Error(`DEPLOY_SECRET not found in ${this.deploySecretFile} — cannot trigger deploy`)

    // 1) start the build
    const startRes = await fetch(`${this.adminUrl}/api/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Deploy-Secret': secret },
      body: JSON.stringify({ description }),
      signal: AbortSignal.timeout(15000),
    })
    const startBody = await startRes.json().catch(() => ({}))
    if (startRes.status === 401) throw new Error('deploy unauthorized (DEPLOY_SECRET mismatch)')
    let jobId = startBody.jobId
    if (!jobId) throw new Error(`deploy did not start: ${JSON.stringify(startBody).slice(0, 200)}`)
    const queued = startRes.status === 409 // a build was already running; we coalesce onto it

    // 2) poll status until terminal (or timeout)
    const deadline = Date.now() + this.pollTimeoutMs
    let status = 'in_progress', log = []
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 8000))
      const s = await fetch(`${this.adminUrl}/api/deploy/status?jobId=${encodeURIComponent(jobId)}`, { signal: AbortSignal.timeout(10000) }).catch(() => null)
      if (!s?.ok) continue
      const sb = await s.json().catch(() => ({}))
      status = sb.status ?? status
      log = Array.isArray(sb.log) ? sb.log : log
      if (['COMPLETED', 'FAILED', 'HEALTH_FAILED'].includes(status)) break
    }

    const done = status === 'COMPLETED'
    // mode-aware PUBLIC site base (secure → https://<domain>, IP → http://<ip>:3000) so the agent
    // reports the CORRECT public link, never an internal/plain-HTTP host.
    const site_url = (() => { try { return publicSiteUrl(this.deploySecretFile.replace(/bridges\/app\/\.env\.local$/, 'app/.env.local')) } catch { return '' } })()
    return textResult({
      rebuilt: done,
      status, jobId, queued, site_url,
      description,
      log_tail: log.slice(-15),
      message: done
        ? `Slot rebuilt and healthy (the build ran a health check — COMPLETED means live). Your changes are live at ${site_url || 'your site'}. Report the public URL; do NOT curl an internal/plain-HTTP host to "verify".`
        : status === 'in_progress'
          ? 'Build still running past the wait window; check the Deploy panel for the final status.'
          : `Build ended ${status}. See log_tail; fix the cause before retrying (do not retry blindly).`,
    })
  }
}
