import { createServer } from 'http'
import { spawn } from 'child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises'
import { join, dirname, resolve as pathResolve } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'
import { handleMcpHandshake } from './mcp-handshake.js'

// ── Frozen Archetypes MCP server (L2, port 3223) ────────────────────────────
// Any of the 6 coding agents (claude-code, codex, gemini-cli, qwen-code,
// kimi-code, hermes) can add a whole page group (news / blog / documentation) to
// the slot by THAWING a frozen archetype — pure file copy + token substitution,
// ZERO code generation. Two tools:
//   owner_archetype_list_frozen        — read-only catalog (for matching).
//   owner_archetype_thaw_content_group — mutating; §8.2 confirm via dry_run.
// The frozen archetype tree is fetched from the data service (:3300, the closed
// store) and thawed into the slot with the project-local thaw-frozen-archetype.mjs
// emitter. This is an L2 Hermes-side MCP — separate from the L1 deploy MCP.

const __dirname = dirname(fileURLToPath(import.meta.url))

function textResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] }
}

function toolsSchema() {
  return [
    {
      name: 'owner_archetype_list_frozen',
      description:
        'List the frozen archetypes available in the closed store (read-only). Each entry has its ' +
        'capability, the request intents it FITS, and what it DOES NOT serve — use this to match a ' +
        "request to a real archetype, or to refuse honestly when none fits. Today: 'content-collection' " +
        '(news / blog / documentation). Call this BEFORE proposing how to add a page group.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'owner_archetype_thaw_content_group',
      description:
        'Add a whole page group (a news section, a blog, a documentation section) to the slot by thawing ' +
        'the content-collection archetype — pure file copy + token substitution, NO code generation. It ' +
        'installs the shared content engine if absent, then creates the localized router + N placeholder ' +
        'posts (Lorem body + placeholder image), translating the section label into the given languages.\n\n' +
        'CONFIRM FIRST (§8.2): call with dry_run=true to get a preview of exactly what will be created, show ' +
        'the owner, get explicit confirmation, THEN call without dry_run. Only use for content collections ' +
        '(news/blog/docs); for a cart/checkout/graded-course/app-screen, refuse and offer a new archetype.',
      inputSchema: {
        type: 'object',
        required: ['tab', 'labels'],
        properties: {
          tab: { type: 'string', description: 'URL + folder slug, kebab-case, e.g. "news", "blog", "documentation".' },
          format: { type: 'string', enum: ['news', 'blog', 'document'], description: 'Preset (default "news"). news=NewsArticle/person, blog=BlogPosting/org, document=TechArticle/person.' },
          languages: { type: 'array', items: { type: 'string' }, description: 'BCP-47 codes the app is configured for, e.g. ["en","ru"]. "en" is always the base. Default ["en","ru"].' },
          labels: { type: 'object', description: 'The section display name translated per language, e.g. { "en": "News", "ru": "Новости" }. "en" required. You translate the single word — this is not code generation.' },
          samples: { type: 'integer', description: 'How many placeholder posts to create (default 2, 0 = router only).' },
          force: { type: 'boolean', description: 'Overwrite an existing tab folder (default false — refuse if it exists).' },
          dry_run: { type: 'boolean', description: 'true → return a preview without writing anything (§8.2 confirm step). false/omit → thaw.' },
        },
      },
    },
  ]
}

export class ArchetypesMcpServer {
  constructor({ port, secret, dataUrl, dataSecret, appDir }) {
    this.port = port
    this.secret = secret
    this.dataUrl = dataUrl ?? 'http://127.0.0.1:3300'
    this.dataSecret = dataSecret ?? process.env.DATA_SECRET ?? ''
    // The guest slot root (where the engine + tab are thawed). bridges/platforms -> ../../app
    this.appDir = appDir ?? pathResolve(__dirname, '../../app')
    this.emitter = join(this.appDir, '.agents/skills/thaw-frozen-archetype/thaw-frozen-archetype.mjs')
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
        res.end(JSON.stringify({ ok: true, server: 'archetypes' })); return
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
      console.log(`[mcp:archetypes] http://127.0.0.1:${this.port}`)
    )
  }

  _handle(rpc, res) {
    const { id, method, params } = rpc
    const ok = r => res.end(JSON.stringify({ jsonrpc: '2.0', id, result: r }))
    const fail = (c, m) => res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: c, message: m } }))
    if (handleMcpHandshake(rpc, res, 'fractera-archetypes-bridge')) return
    if (method === 'tools/list') return ok({ tools: toolsSchema() })
    if (method === 'tools/call') {
      return this._call(params?.name, params?.arguments ?? {})
        .then(ok)
        .catch(e => fail(-32603, e.message))
    }
    fail(-32601, `Method not found: ${method}`)
  }

  async _call(name, args) {
    if (name === 'owner_archetype_list_frozen') return this._list()
    if (name === 'owner_archetype_thaw_content_group') return this._thaw(args)
    throw new Error(`Unknown tool: ${name}`)
  }

  _dataHeaders() {
    const h = { 'X-Agent-Identity': 'hermes' }
    if (this.dataSecret) h['X-Data-Secret'] = this.dataSecret
    return h
  }

  async _list() {
    const r = await fetch(`${this.dataUrl}/archetypes`, { headers: this._dataHeaders(), signal: AbortSignal.timeout(10000) })
    if (!r.ok) throw new Error(`store list failed (${r.status})`)
    const { archetypes } = await r.json()
    return textResult({ archetypes })
  }

  async _thaw(args) {
    const tab = String(args.tab ?? '').trim()
    if (!/^[a-z][a-z0-9-]*$/.test(tab)) throw new Error('tab must be kebab-case, e.g. "news"')
    const format = ['news', 'blog', 'document'].includes(args.format) ? args.format : 'news'
    const languages = Array.isArray(args.languages) && args.languages.length ? args.languages.map(String) : ['en', 'ru']
    if (!languages.includes('en')) languages.unshift('en')
    const labels = (args.labels && typeof args.labels === 'object') ? args.labels : {}
    if (!labels.en) throw new Error('labels.en is required (the English section name)')
    const samples = Math.max(0, Math.min(10, Number.isFinite(args.samples) ? Math.trunc(args.samples) : 2))
    const force = !!args.force

    if (args.dry_run) {
      return textResult({
        preview: true,
        willCreate: {
          router: `app/[lang]/${tab}/ (+ engine if the slot lacks lib/content)`,
          posts: samples,
          languages,
          labels,
          format,
        },
        confirm_prompt:
          `Создам ${format}-коллекцию /${tab} на языках [${languages.join(', ')}], ` +
          `метка ${JSON.stringify(labels)}, ${samples} постов-заглушек (Lorem + картинка-заглушка). ` +
          `Если в слоте нет контент-движка — установлю его. Повторите вызов без dry_run для подтверждения.`,
      })
    }

    // 1) fetch the frozen tree from the closed store
    const r = await fetch(`${this.dataUrl}/archetypes/content-collection`, { headers: this._dataHeaders(), signal: AbortSignal.timeout(15000) })
    if (!r.ok) throw new Error(`store fetch failed (${r.status})`)
    const { files } = await r.json()
    if (!files || !files['manifest.json']) throw new Error('store returned no archetype files')

    // 2) unpack the tree into a temp store dir
    const storeDir = await mkdtemp(join(tmpdir(), 'frozen-archetype-'))
    try {
      for (const [rel, content] of Object.entries(files)) {
        const dest = join(storeDir, rel)
        await mkdir(dirname(dest), { recursive: true })
        await writeFile(dest, content, 'utf8')
      }

      // 3) run the project-local emitter into the slot (pure file ops, no codegen)
      const cliArgs = [
        this.emitter,
        '--store', storeDir,
        '--out', this.appDir,
        '--tab', tab,
        '--format', format,
        '--languages', languages.join(','),
        '--samples', String(samples),
      ]
      for (const lang of languages) if (labels[lang]) cliArgs.push(`--label-${lang}`, String(labels[lang]))
      if (force) cliArgs.push('--force')

      const out = await this._spawn('node', cliArgs)
      return textResult({
        thawed: true,
        tab, format, languages, labels, samples,
        emitter_output: out.trim().split('\n').slice(-12),
        next: 'Run `npm run gen:lists` then `npx tsc --noEmit` in the slot; replace the Lorem copy and the placeholder image.',
      })
    } finally {
      await rm(storeDir, { recursive: true, force: true }).catch(() => {})
    }
  }

  _spawn(cmd, cliArgs) {
    return new Promise((res, rej) => {
      const p = spawn(cmd, cliArgs, { cwd: this.appDir })
      let out = '', err = ''
      p.stdout.on('data', d => { out += d })
      p.stderr.on('data', d => { err += d })
      p.on('error', rej)
      p.on('close', code => code === 0 ? res(out) : rej(new Error(`emitter exited ${code}: ${(err || out).slice(-400)}`)))
    })
  }
}
