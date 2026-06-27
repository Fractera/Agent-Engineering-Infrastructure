import { createServer } from 'http'
import { spawn } from 'child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises'
import { join, dirname, resolve as pathResolve } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import { handleMcpHandshake } from './mcp-handshake.js'
import { publicTabUrls } from './site-url.js'

// ── Content CRUD MCP server (L2, port 3226) ─────────────────────────────────
// Scenario #1 of 8 (4 FS + 4 DB). ONE operation-discriminated tool over co-located
// content collections in the slot. The agent supplies DATA (a structured content
// object — NOT programming); the slot emitter writes the FILES, by construction, with
// ZERO code generation. Any of the 6 agents => identical result.
//   owner_content_manage_collection(operation: create|edit|delete, target: group|page, …)
// create group delegates to the Frozen Template Constructor (compose-frozen-template);
// create/edit page serialize _data/* from the payload; deletes remove the folder and the
// slot emitter regenerates _list.generated.ts. EVERY successful mutation fixes the result
// in the Deployment table (deployment_records) — structural, not left to the agent's memory.
// Mutating → §8.2 confirm via dry_run. Role-gate (architect) inherits step 135. L2 only.

const __dirname = dirname(fileURLToPath(import.meta.url))
const textResult = data => ({ content: [{ type: 'text', text: JSON.stringify(data) }] })

function toolsSchema() {
  return [
    {
      name: 'owner_content_manage_collection',
      description:
        'Create, edit or delete a content GROUP (a tab — news/blog/documentation) or a PAGE (a post in a ' +
        'tab) in the slot — deterministic file CRUD, NO code generation. You pass DATA (the content object), ' +
        'the tool writes the files and regenerates the post list.\n\n' +
        'ANTI-DESTRUCTIVE: if a group already exists you ADD a page or EDIT it — never recreate. edit/delete ' +
        'require the target to exist. INTEGRITY enforced: folder===slug, languages only within the app\'s ' +
        'declared set (en + the configured ones — never a stray language), no foreign-script artifacts, the ' +
        'founder block only last, a required root anchor.\n\n' +
        'CONFIRM FIRST (§8.2): call dry_run=true to preview the exact files + show the owner, get explicit ' +
        'confirmation, THEN call without dry_run. On success the result is fixed in the Deployment table and ' +
        'the slot still needs a REBUILD (owner_deploy_rebuild_slot) to go live.',
      inputSchema: {
        type: 'object',
        required: ['operation', 'target', 'tab'],
        properties: {
          operation: { type: 'string', enum: ['create', 'edit', 'delete'], description: 'What to do.' },
          target: { type: 'string', enum: ['group', 'page'], description: 'group = a whole tab; page = one post in a tab.' },
          backing: { type: 'string', enum: ['fs'], description: 'Storage backing. Only fs is implemented (db is the next of the 8 scenarios).' },
          tab: { type: 'string', description: 'Tab slug, kebab-case (news, blog, documentation).' },
          slug: { type: 'string', description: 'Page slug, kebab-case (required for target=page). The folder is named exactly this (folder===slug).' },
          data: { type: 'object', description: 'Page content for create/edit page: { date?, tags?, en:{title,subtitle,description,blocks,faq,…}, <lang>:{…partial override} }. en is required; en must weave the root anchor [Agentic Engineering Infrastructure](/<lang>); a founder block may only be last.' },
          ui: { type: 'object', description: 'Tab UI chrome for edit group: { en:{…full}, <lang>:{…partial} }.' },
          labels: { type: 'object', description: 'Section name per language for create group (en required).' },
          format: { type: 'string', enum: ['news', 'blog', 'document'], description: 'Preset for create group (default news).' },
          languages: { type: 'array', items: { type: 'string' }, description: 'BCP-47 codes for create group; default = the slot\'s declared set.' },
          samples: { type: 'integer', description: 'Placeholder documents for create group (default 2).' },
          platform: { type: 'string', description: 'The agent doing the work (for the Deployment record). Default hermes.' },
          model: { type: 'string', description: 'Model id (for the Deployment record).' },
          dry_run: { type: 'boolean', description: 'true → preview without writing (§8.2). false/omit → execute.' },
        },
      },
    },
  ]
}

export class ContentCrudMcpServer {
  constructor({ port, secret, dataUrl, dataSecret, appDir }) {
    this.port = port
    this.secret = secret
    this.dataUrl = dataUrl ?? 'http://127.0.0.1:3300'
    this.dataSecret = dataSecret ?? process.env.DATA_SECRET ?? ''
    this.appDir = appDir ?? pathResolve(__dirname, '../../app')
    this.emitter = join(this.appDir, '.agents/skills/manage-content-collections/manage-content-collections.mjs')
    this.appEnvFile = join(this.appDir, '.env.local')
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
      if (req.method === 'GET' && req.url === '/health') { res.end(JSON.stringify({ ok: true, server: 'content-crud' })); return }
      if (req.method !== 'POST') { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return }
      let body = ''
      req.on('data', c => { body += c })
      req.on('end', () => { try { this._handle(JSON.parse(body), res) } catch { res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' })) } })
    })
    server.listen(this.port, '127.0.0.1', () => console.log(`[mcp:content-crud] http://127.0.0.1:${this.port}`))
  }

  _handle(rpc, res) {
    const { id, method, params } = rpc
    const ok = r => res.end(JSON.stringify({ jsonrpc: '2.0', id, result: r }))
    const fail = (c, m) => res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: c, message: m } }))
    if (handleMcpHandshake(rpc, res, 'fractera-content-crud-bridge')) return
    if (method === 'tools/list') return ok({ tools: toolsSchema() })
    if (method === 'tools/call') return this._call(params?.name, params?.arguments ?? {}).then(ok).catch(e => fail(-32603, e.message))
    fail(-32601, `Method not found: ${method}`)
  }

  async _call(name, args) {
    if (name === 'owner_content_manage_collection') return this._manage(args)
    throw new Error(`Unknown tool: ${name}`)
  }

  _dataHeaders() {
    const h = { 'X-Agent-Identity': 'hermes', 'Content-Type': 'application/json' }
    if (this.dataSecret) h['X-Data-Secret'] = this.dataSecret
    return h
  }

  async _manage(args) {
    const operation = String(args.operation ?? '')
    const target = String(args.target ?? '')
    const tab = String(args.tab ?? '').trim()
    const slug = args.slug != null ? String(args.slug).trim() : ''
    if (!['create', 'edit', 'delete'].includes(operation)) throw new Error('operation must be create|edit|delete')
    if (!['group', 'page'].includes(target)) throw new Error('target must be group|page')
    if (!/^[a-z][a-z0-9-]*$/.test(tab)) throw new Error('tab must be kebab-case')
    if (target === 'page' && !/^[a-z][a-z0-9-]*$/.test(slug)) throw new Error('slug (kebab-case) is required for target=page')
    if (args.backing && args.backing !== 'fs') throw new Error('only backing=fs is implemented (db is the next of the 8 scenarios)')

    const work = await mkdtemp(join(tmpdir(), 'content-crud-'))
    try {
      const cli = [this.emitter, '--out', this.appDir, '--op', operation, '--target', target, '--tab', tab]
      if (target === 'page') cli.push('--slug', slug)
      if (args.dry_run) cli.push('--dry-run')

      if ((operation === 'create' || operation === 'edit') && target === 'page') {
        if (!args.data || typeof args.data !== 'object') throw new Error('data (content object with an en base) is required for page create/edit')
        const f = join(work, 'data.json'); await writeFile(f, JSON.stringify(args.data), 'utf8'); cli.push('--data', f)
      }
      if (operation === 'edit' && target === 'group') {
        if (!args.ui || typeof args.ui !== 'object') throw new Error('ui (localized chrome object) is required for group edit')
        const f = join(work, 'ui.json'); await writeFile(f, JSON.stringify(args.ui), 'utf8'); cli.push('--ui', f)
      }
      if (operation === 'create' && target === 'group') {
        // delegate to the Frozen Template Constructor → materialize the store from the data service
        const storeDir = await this._materializeStore(work)
        cli.push('--store', storeDir)
        const format = ['news', 'blog', 'document'].includes(args.format) ? args.format : 'news'
        cli.push('--format', format)
        if (Array.isArray(args.languages) && args.languages.length) cli.push('--languages', args.languages.map(String).join(','))
        if (Number.isFinite(args.samples)) cli.push('--samples', String(Math.max(0, Math.min(10, Math.trunc(args.samples)))))
        const labels = (args.labels && typeof args.labels === 'object') ? args.labels : {}
        for (const [l, v] of Object.entries(labels)) cli.push(`--label-${l}`, String(v))
      }

      const { code, out } = await this._spawn('node', cli)
      const lastJson = (() => { try { return JSON.parse(out.trim().split('\n').filter(Boolean).pop()) } catch { return null } })()

      // refusal / validation failure (emitter or delegated composer exits 2 with JSON)
      if (code === 2 && lastJson && (lastJson.refused || lastJson.ok === false)) {
        return textResult({ ok: false, refused: true, operation, target, tab, slug, errors: lastJson.errors, axis: lastJson.axis, detail: lastJson.detail,
          advice: lastJson.axis ? 'No frozen primitive fits this axis — offer to harvest a new brick (proven + repeating) or use classic development.' : 'Fix the listed integrity errors and retry. Never inject an unshipped language; never recreate an existing group.' })
      }
      if (args.dry_run) {
        return textResult({ preview: true, operation, target, tab, slug, plan: lastJson?.plan ?? lastJson ?? out.trim().split('\n').slice(-12),
          confirm_prompt: `Правильно ли я понимаю: ${operation} ${target} «${tab}${slug ? '/' + slug : ''}»? Перечисленное выше будет записано. Повторите вызов без dry_run для подтверждения.` })
      }
      if (code !== 0) throw new Error(`emitter exited ${code}: ${out.slice(-400)}`)

      // TERMINAL: fix the result in the Deployment table (deployment_records). Structural — not
      // left to the agent to remember. The slot still needs a REBUILD before it is live.
      const view_urls = (() => { try { return publicTabUrls(tab, ['en'], this.appEnvFile) } catch { return [] } })()
      const page_url = (view_urls[0] ?? `/${tab}`) + (target === 'page' ? `/${slug}` : '')
      const rec = await this._record({
        platform: args.platform ?? 'hermes', model: args.model ?? null, page_url,
        commit_message: `content_op ${operation} ${target} ${tab}${slug ? '/' + slug : ''}`, step: '154', status: 'ready',
      })
      return textResult({ ok: true, operation, target, tab, slug, view_urls, recorded: rec.ok, deployment_id: rec.id, record_error: rec.error,
        emitter_output: out.trim().split('\n').slice(-12),
        next: 'Now REBUILD the slot with owner_deploy_rebuild_slot so the change is live; then the view_urls work. Do NOT run npm/gen:lists/tsc yourself; do NOT curl an internal/plain-HTTP host.' })
    } finally {
      await rm(work, { recursive: true, force: true }).catch(() => {})
    }
  }

  // Fetch the frozen-templates store tree from the data service and write it to a temp dir
  // (mirrors the template-constructor server) so the delegated composer has --store.
  async _materializeStore(work) {
    const r = await fetch(`${this.dataUrl}/frozen-templates/tree`, { headers: this._dataHeaders(), signal: AbortSignal.timeout(15000) })
    if (!r.ok) throw new Error(`store tree fetch failed (${r.status})`)
    const { files } = await r.json()
    if (!files || !files['registry.json']) throw new Error('store returned no template files')
    const storeDir = join(work, 'store')
    for (const [rel, content] of Object.entries(files)) { const dest = join(storeDir, rel); await mkdir(dirname(dest), { recursive: true }); await writeFile(dest, content, 'utf8') }
    return storeDir
  }

  // Reuse the deployment_records write contract (same endpoint + row shape as the
  // deployments bridge). Best-effort: a failed record does NOT undo the (already written)
  // content mutation, but it is surfaced so the owner can record it manually.
  async _record(args) {
    try {
      const row = {
        id: randomUUID(), result: 3, project: 'default', tokens: 0,
        platform: args.platform, model: args.model, page_url: args.page_url,
        commit_message: args.commit_message, status: args.status ?? 'ready',
        duration_ms: null, commit_hash: null, branch: null, step: args.step ?? null,
        author: 'Content CRUD', created_by: 'hermes@agent',
      }
      const res = await fetch(`${this.dataUrl}/db/tables/deployment_records`, { method: 'POST', headers: this._dataHeaders(), body: JSON.stringify(row), signal: AbortSignal.timeout(10000) })
      if (!res.ok) return { ok: false, error: `data service ${res.status}` }
      return { ok: true, id: row.id }
    } catch (e) { return { ok: false, error: String(e?.message ?? e) } }
  }

  _spawn(cmd, cli) {
    return new Promise((res, rej) => {
      const p = spawn(cmd, cli, { cwd: this.appDir })
      let out = '', err = ''
      p.stdout.on('data', d => { out += d }); p.stderr.on('data', d => { err += d })
      p.on('error', rej)
      p.on('close', code => res({ code, out: out + (err ? `\n[stderr] ${err}` : '') }))
    })
  }
}
