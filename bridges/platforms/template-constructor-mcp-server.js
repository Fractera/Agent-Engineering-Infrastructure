import { createServer } from 'http'
import { spawn } from 'child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises'
import { join, dirname, resolve as pathResolve } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'
import { handleMcpHandshake } from './mcp-handshake.js'

// ── Frozen Template Constructor MCP server (L2, port 3224) ──────────────────
// Any of the 6 agents adds a whole STRUCTURE (news / blog / documentation / …) by
// COMPOSING it from the Frozen Template Constructor — vetted frozen bricks assembled
// by file copy + token substitution, ZERO code generation. Two tools:
//   owner_template_list_primitives    — read-only basis (registry) for matching.
//   owner_template_compose_structure  — mutating; §8.2 confirm via dry_run.
// The store tree is fetched from the data service (:3300, frozen-templates) and
// composed into the slot with the project-local compose-frozen-template.mjs emitter.
// Strategy: CRUD-DOCS/workspace-standards/frozen-template-constructor.md. L2 only.

const __dirname = dirname(fileURLToPath(import.meta.url))
const textResult = data => ({ content: [{ type: 'text', text: JSON.stringify(data) }] })

function toolsSchema() {
  return [
    {
      name: 'owner_template_list_primitives',
      description:
        'List the basis of the Frozen Template Constructor (read-only): the harvested primitives, the ' +
        'declared providers/aspects, the axes, and the roadmap. Each primitive declares its envelope ' +
        '(base axes: source × depth × rendering; supported aspects: i18n, roles). Use this to MATCH a ' +
        'request (100%-fit on every axis) or to refuse honestly when nothing fits. Today: one ready ' +
        "primitive 'files-depth1' (flat file-backed multilingual list — news/blog/docs feed).",
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'owner_template_compose_structure',
      description:
        'Compose a whole structure into the slot from a frozen primitive — file copy + token substitution, ' +
        'NO code generation. It MATCHES the request to a primitive by envelope (100%-fit or it refuses ' +
        'naming the failing axis), installs the shared engine if absent (versioned, side-by-side), and ' +
        'composes the router + N placeholder documents through the seams (list provider + uniform aspects). ' +
        'Defaults select the reference primitive (source=files, depth=1, rendering=static).\n\n' +
        'CONFIRM FIRST (§8.2): call dry_run=true to preview + show the owner, get explicit confirmation, ' +
        'THEN call without dry_run. If the request does not fit (e.g. a dashboard, a cart, a db catalogue, a ' +
        'depth-2 tree), it refuses with the failing axis — offer to harvest a new brick or use classic ' +
        'development; do not force a bad fit.',
      inputSchema: {
        type: 'object',
        required: ['tab', 'labels'],
        properties: {
          tab: { type: 'string', description: 'URL + folder slug, kebab-case (news, blog, documentation).' },
          format: { type: 'string', enum: ['news', 'blog', 'document'], description: 'Preset (default news).' },
          languages: { type: 'array', items: { type: 'string' }, description: 'BCP-47 codes; en is base. Default ["en","ru"].' },
          labels: { type: 'object', description: 'Section name per language (en required). You translate the single word — not code generation.' },
          samples: { type: 'integer', description: 'How many placeholder documents (default 2).' },
          source: { type: 'string', enum: ['files', 'db-at-build', 'runtime'], description: 'Base axis — list provider. Default files. db-at-build/runtime are roadmap → refusal.' },
          depth: { type: 'integer', description: 'Base axis — structural depth (default 1). depth>1 is roadmap → refusal.' },
          roles: { type: 'string', description: 'Aspect — "off" (default, public) or a comma role list (e.g. "user,architect") to inject the role gate uniformly.' },
          dry_run: { type: 'boolean', description: 'true → preview without writing (§8.2). false/omit → compose.' },
        },
      },
    },
  ]
}

export class TemplateConstructorMcpServer {
  constructor({ port, secret, dataUrl, dataSecret, appDir }) {
    this.port = port
    this.secret = secret
    this.dataUrl = dataUrl ?? 'http://127.0.0.1:3300'
    this.dataSecret = dataSecret ?? process.env.DATA_SECRET ?? ''
    this.appDir = appDir ?? pathResolve(__dirname, '../../app')
    this.emitter = join(this.appDir, '.agents/skills/compose-frozen-template/compose-frozen-template.mjs')
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
      if (req.method === 'GET' && req.url === '/health') { res.end(JSON.stringify({ ok: true, server: 'template-constructor' })); return }
      if (req.method !== 'POST') { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return }
      let body = ''
      req.on('data', c => { body += c })
      req.on('end', () => { try { this._handle(JSON.parse(body), res) } catch { res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' })) } })
    })
    server.listen(this.port, '127.0.0.1', () => console.log(`[mcp:template-constructor] http://127.0.0.1:${this.port}`))
  }

  _handle(rpc, res) {
    const { id, method, params } = rpc
    const ok = r => res.end(JSON.stringify({ jsonrpc: '2.0', id, result: r }))
    const fail = (c, m) => res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: c, message: m } }))
    if (handleMcpHandshake(rpc, res, 'fractera-template-constructor-bridge')) return
    if (method === 'tools/list') return ok({ tools: toolsSchema() })
    if (method === 'tools/call') return this._call(params?.name, params?.arguments ?? {}).then(ok).catch(e => fail(-32603, e.message))
    fail(-32601, `Method not found: ${method}`)
  }

  async _call(name, args) {
    if (name === 'owner_template_list_primitives') return this._list()
    if (name === 'owner_template_compose_structure') return this._compose(args)
    throw new Error(`Unknown tool: ${name}`)
  }

  _dataHeaders() {
    const h = { 'X-Agent-Identity': 'hermes' }
    if (this.dataSecret) h['X-Data-Secret'] = this.dataSecret
    return h
  }

  async _list() {
    const r = await fetch(`${this.dataUrl}/frozen-templates/registry`, { headers: this._dataHeaders(), signal: AbortSignal.timeout(10000) })
    if (!r.ok) throw new Error(`registry fetch failed (${r.status})`)
    return textResult(await r.json())
  }

  async _compose(args) {
    const tab = String(args.tab ?? '').trim()
    if (!/^[a-z][a-z0-9-]*$/.test(tab)) throw new Error('tab must be kebab-case')
    const format = ['news', 'blog', 'document'].includes(args.format) ? args.format : 'news'
    const languages = Array.isArray(args.languages) && args.languages.length ? args.languages.map(String) : ['en', 'ru']
    if (!languages.includes('en')) languages.unshift('en')
    const labels = (args.labels && typeof args.labels === 'object') ? args.labels : {}
    if (!labels.en) throw new Error('labels.en is required')
    const samples = Math.max(0, Math.min(10, Number.isFinite(args.samples) ? Math.trunc(args.samples) : 2))
    const source = ['files', 'db-at-build', 'runtime'].includes(args.source) ? args.source : 'files'
    const depth = Number.isFinite(args.depth) ? Math.trunc(args.depth) : 1
    const rendering = source === 'runtime' ? 'dynamic-descriptor' : 'static'
    const roles = (typeof args.roles === 'string' && args.roles.trim() && args.roles !== 'off') ? args.roles.trim() : 'off'

    if (args.dry_run) {
      return textResult({
        preview: true,
        match: { source, depth, rendering, i18n: 'multi', roles },
        willCreate: { router: `app/[lang]/${tab}/ (+ engine if absent)`, documents: samples, format, languages, labels },
        note: 'If source/depth/rendering have no primitive, the real call will REFUSE naming the failing axis (offer harvest or classic dev).',
        confirm_prompt:
          `Соберу ${format}-структуру /${tab} (источник=${source}, глубина=${depth}, ${rendering}; роли=${roles}) на [${languages.join(', ')}], ` +
          `метка ${JSON.stringify(labels)}, ${samples} документов-заглушек. Повторите вызов без dry_run для подтверждения.`,
      })
    }

    const r = await fetch(`${this.dataUrl}/frozen-templates/tree`, { headers: this._dataHeaders(), signal: AbortSignal.timeout(15000) })
    if (!r.ok) throw new Error(`store tree fetch failed (${r.status})`)
    const { files } = await r.json()
    if (!files || !files['registry.json']) throw new Error('store returned no template files')

    const storeDir = await mkdtemp(join(tmpdir(), 'frozen-templates-'))
    try {
      for (const [rel, content] of Object.entries(files)) {
        const dest = join(storeDir, rel)
        await mkdir(dirname(dest), { recursive: true })
        await writeFile(dest, content, 'utf8')
      }
      const cli = [this.emitter, '--store', storeDir, '--out', this.appDir, '--source', source, '--depth', String(depth), '--rendering', rendering, '--tab', tab, '--format', format, '--languages', languages.join(','), '--samples', String(samples), '--roles', roles]
      for (const l of languages) if (labels[l]) cli.push(`--label-${l}`, String(labels[l]))
      const { code, out } = await this._spawn('node', cli)
      const refusal = (() => { try { const last = out.trim().split('\n').filter(Boolean).pop(); const j = JSON.parse(last); return j.refused ? j : null } catch { return null } })()
      if (refusal) return textResult({ refused: true, axis: refusal.axis, detail: refusal.detail, advice: 'No frozen primitive fits this axis. Offer to harvest a new brick (only if proven + repeating) or use classic development.' })
      if (code !== 0) throw new Error(`composer exited ${code}: ${out.slice(-400)}`)
      return textResult({ composed: true, tab, source, depth, rendering, roles, format, languages, labels, samples, emitter_output: out.trim().split('\n').slice(-12), next: 'Run `npm run gen:lists` then `npx tsc --noEmit`; replace the placeholder copy + image.' })
    } finally {
      await rm(storeDir, { recursive: true, force: true }).catch(() => {})
    }
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
