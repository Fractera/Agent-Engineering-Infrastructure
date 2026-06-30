import { createServer } from 'http'
import { spawn } from 'child_process'
import { mkdtemp, writeFile, rm } from 'fs/promises'
import { join, dirname, resolve as pathResolve } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'
import { handleMcpHandshake } from './mcp-handshake.js'

// ── Language Expansion MCP server (L2, port 3228) ───────────────────────────
// THE one sanctioned way to extend an EXISTING multilingual site to a NEW language. Two tools:
//   owner_content_add_site_language  — fan out a new language across ALL groups + posts, seeded with
//     the DEFAULT language's content (site instantly valid, no translation API), mark every seed
//     noindex (Doorway guard), and open ONE dev-step per language so no translation is forgotten.
//   owner_content_translate_pending  — the non-blocking translation runner: the agent itself
//     translates the STRINGS (subscription, no external API) into the frozen structure; clears the
//     seed marker; does NOT deploy (the owner presses Deploy in the footer to publish).
// Both delegate to slot emitters (self-sufficient for a lone CLI agent — §0). SINGLE-LINE JSON parse
// (step 158). Mutating → §8.2 confirm via dry_run. Role-gate (architect) inherits step 135. L2 only.

const __dirname = dirname(fileURLToPath(import.meta.url))
const textResult = data => ({ content: [{ type: 'text', text: JSON.stringify(data) }] })

function toolsSchema() {
  return [
    {
      name: 'owner_content_add_site_language',
      description:
        'Add a NEW language to an EXISTING site across ALL content (every group + every post) in one ' +
        'deterministic pass. This is the ONLY correct way to add a language to existing content. Do NOT ' +
        'use owner_content_manage_collection, the Frozen Template Constructor (compose), or ' +
        'owner_template_update_group for this — they cannot add a per-page locale and will refuse / break ' +
        'the site.\n\n' +
        'What it does: seeds each page\'s new-language file with the DEFAULT language\'s content (the site ' +
        'is valid the moment the build finishes — NO machine translation, NO external API), rewrites every ' +
        'language-dependent link to the new language, marks each seed needs-translation so the engine ' +
        'serves it as robots:noindex (Google never indexes a cross-language duplicate — Doorway guard; ' +
        'canonical/hreflang stay correct automatically), updates each group manifest + the 4 menus, and ' +
        'opens ONE dev-step per language listing the pages to translate (nothing is forgotten).\n\n' +
        'PRECONDITION: the language must ALREADY be in the app\'s language set (App Settings → rebuild) — ' +
        'refused otherwise. Translation is a SEPARATE, non-blocking step (owner_content_translate_pending).\n\n' +
        'CONFIRM FIRST (§8.2): call dry_run=true to preview, show the owner, then call without dry_run. ' +
        'After success the slot still needs a REBUILD (owner_deploy_rebuild_slot) to publish the new routes.',
      inputSchema: {
        type: 'object',
        required: ['lang'],
        properties: {
          lang: { type: 'string', description: 'BCP-47 code of the language to add (e.g. hy, fr, es). Must already be in the app language set.' },
          platform: { type: 'string', description: 'The agent doing the work (Deployment record). Default hermes.' },
          model: { type: 'string', description: 'Model id (Deployment record).' },
          dry_run: { type: 'boolean', description: 'true → preview the files without writing (§8.2). false/omit → execute.' },
        },
      },
    },
    {
      name: 'owner_content_translate_pending',
      description:
        'The non-blocking translation runner — translate the pages a previous owner_content_add_site_language ' +
        'left seeded with the default language. YOU (the agent) are the translator: no external translation ' +
        'API (subscription rule). Call it in a loop:\n' +
        '  1) call with { lang } → it returns the next pending page as raw source + the ordered block kinds;\n' +
        '  2) translate the STRINGS only (keep the block kinds/order, keep the root anchor and /<lang>/ links);\n' +
        '  3) call with { lang, op:"write", tab, slug, translations:{ fields, blocks, faq } } → it validates ' +
        'structure parity, writes the translation and clears the seed marker.\n' +
        'Repeat until remaining=0. It does NOT deploy — tell the owner to press Deploy in the footer to ' +
        'publish (the translated pages then flip from noindex to indexable). You may translate with extra ' +
        'regional focus if the dev-step carries owner notes.',
      inputSchema: {
        type: 'object',
        required: ['lang'],
        properties: {
          lang: { type: 'string', description: 'BCP-47 code to translate into.' },
          op: { type: 'string', enum: ['next', 'write'], description: 'next (default) = fetch the next pending page; write = persist a translation.' },
          tab: { type: 'string', description: 'Group/tab slug (required for write; optional for next to target a specific page).' },
          slug: { type: 'string', description: 'Page slug (required for write).' },
          translations: { type: 'object', description: 'For op=write: { fields:{title,seoTitle?,subtitle?,description?,summary?,keywords?}, blocks:[{kind,text|items}], faq:[{q,a}] } — SAME block kinds/order as the source (strings only; never add/remove/reorder blocks).' },
        },
      },
    },
  ]
}

export class LanguageExpansionMcpServer {
  constructor({ port, secret, dataUrl, dataSecret, appDir }) {
    this.port = port
    this.secret = secret
    this.dataUrl = dataUrl ?? 'http://127.0.0.1:3300'
    this.dataSecret = dataSecret ?? process.env.DATA_SECRET ?? ''
    this.appDir = appDir ?? pathResolve(__dirname, '../../app')
    this.skillDir = join(this.appDir, '.agents/skills/expand-site-language')
    this.fanOut = join(this.skillDir, 'fan-out-site-language.mjs')
    this.translate = join(this.skillDir, 'translate-content-page.mjs')
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
      if (req.method === 'GET' && req.url === '/health') { res.end(JSON.stringify({ ok: true, server: 'language-expansion' })); return }
      if (req.method !== 'POST') { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return }
      let body = ''
      req.on('data', c => { body += c })
      req.on('end', () => { try { this._handle(JSON.parse(body), res) } catch { res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' })) } })
    })
    server.listen(this.port, '127.0.0.1', () => console.log(`[mcp:language-expansion] http://127.0.0.1:${this.port}`))
  }

  _handle(rpc, res) {
    const { id, method, params } = rpc
    const ok = r => res.end(JSON.stringify({ jsonrpc: '2.0', id, result: r }))
    const fail = (c, m) => res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: c, message: m } }))
    if (handleMcpHandshake(rpc, res, 'fractera-language-expansion-bridge')) return
    if (method === 'tools/list') return ok({ tools: toolsSchema() })
    if (method === 'tools/call') return this._call(params?.name, params?.arguments ?? {}).then(ok).catch(e => fail(-32603, e.message))
    fail(-32601, `Method not found: ${method}`)
  }

  async _call(name, args) {
    if (name === 'owner_content_add_site_language') return this._addLanguage(args)
    if (name === 'owner_content_translate_pending') return this._translate(args)
    throw new Error(`Unknown tool: ${name}`)
  }

  async _addLanguage(args) {
    const lang = String(args.lang ?? '').trim()
    if (!/^[a-z]{2}(-[A-Za-z0-9]+)?$/.test(lang)) throw new Error('lang must be a BCP-47 code')
    const cli = [this.fanOut, '--out', this.appDir, '--lang', lang]
    if (args.dry_run) cli.push('--dry-run')
    const { code, json, out } = await this._spawnJson('node', cli)

    if (code === 2 && json && (json.refused || json.ok === false))
      return textResult({ ok: false, refused: true, lang, errors: json.errors,
        advice: 'Add the language to the app set first (App Settings → rebuild), then retry. Never inject an unshipped language.' })
    if (code !== 0 || !json) throw new Error(`fan-out exited ${code}: ${out.slice(-400)}`)
    if (args.dry_run)
      return textResult({ preview: true, lang, plan: json,
        confirm_prompt: `Правильно ли я понимаю: развернуть язык «${lang}» по ${json.groups ?? 0} группам / ${json.pages ?? 0} страницам (сид языком «${json.default}», noindex до перевода) и завести шаг перевода? Повторите вызов без dry_run для подтверждения.` })

    const rec = await this._record({ platform: args.platform ?? 'hermes', model: args.model ?? null,
      page_url: `/${lang}`, commit_message: `add_site_language ${lang} (${json.pages} pages seeded from ${json.default})`, step: '163' })
    return textResult({ ok: true, lang, default: json.default, groups: json.groups, pages: json.pages,
      pagesNeedingTranslation: json.pagesNeedingTranslation, translationStep: json.translationStep,
      recorded: rec.ok, deployment_id: rec.id, record_error: rec.error,
      next: 'REBUILD the slot (owner_deploy_rebuild_slot) to publish the new routes (seeded with the default language, noindex). Then run owner_content_translate_pending to translate them — that step does NOT deploy.' })
  }

  async _translate(args) {
    const lang = String(args.lang ?? '').trim()
    if (!/^[a-z]{2}(-[A-Za-z0-9]+)?$/.test(lang)) throw new Error('lang must be a BCP-47 code')
    const op = args.op === 'write' ? 'write' : 'next'
    const cli = [this.translate, '--out', this.appDir, '--lang', lang, '--op', op]
    const work = await mkdtemp(join(tmpdir(), 'lang-translate-'))
    try {
      if (op === 'next') {
        if (args.tab && args.slug) cli.push('--tab', String(args.tab), '--slug', String(args.slug))
      } else {
        const tab = String(args.tab ?? ''), slug = String(args.slug ?? '')
        if (!/^[a-z][a-z0-9-]*$/.test(tab) || !/^[a-z][a-z0-9-]*$/.test(slug)) throw new Error('tab and slug (kebab-case) are required for op=write')
        if (!args.translations || typeof args.translations !== 'object') throw new Error('translations object is required for op=write')
        const f = join(work, 'tr.json'); await writeFile(f, JSON.stringify(args.translations), 'utf8')
        cli.push('--tab', tab, '--slug', slug, '--data', f)
      }
      const { code, json, out } = await this._spawnJson('node', cli)
      if (code === 2 && json && json.refused) return textResult({ ok: false, refused: true, lang, errors: json.errors })
      if (!json) throw new Error(`translate exited ${code}: ${out.slice(-400)}`)
      return textResult(json)
    } finally { await rm(work, { recursive: true, force: true }).catch(() => {}) }
  }

  _dataHeaders() {
    const h = { 'X-Agent-Identity': 'hermes', 'Content-Type': 'application/json' }
    if (this.dataSecret) h['X-Data-Secret'] = this.dataSecret
    return h
  }
  async _record(args) {
    try {
      const row = { id: randomUUID(), result: 3, project: 'default', tokens: 0,
        platform: args.platform, model: args.model, page_url: args.page_url,
        commit_message: args.commit_message, status: 'ready', duration_ms: null, commit_hash: null,
        branch: null, step: args.step ?? null, author: 'Language Expansion', created_by: 'hermes@agent' }
      const res = await fetch(`${this.dataUrl}/db/tables/deployment_records`, { method: 'POST', headers: this._dataHeaders(), body: JSON.stringify(row), signal: AbortSignal.timeout(10000) })
      if (!res.ok) return { ok: false, error: `data service ${res.status}` }
      return { ok: true, id: row.id }
    } catch (e) { return { ok: false, error: String(e?.message ?? e) } }
  }

  // Spawn a slot emitter and parse the LAST JSON line (step 158: the emitter prints one JSON line).
  _spawnJson(cmd, cli) {
    return new Promise((res, rej) => {
      const p = spawn(cmd, cli, { cwd: this.appDir })
      let out = '', err = ''
      p.stdout.on('data', d => { out += d }); p.stderr.on('data', d => { err += d })
      p.on('error', rej)
      p.on('close', code => {
        let json = null
        try { json = JSON.parse(out.trim().split('\n').filter(Boolean).pop()) } catch { /* none */ }
        res({ code, json, out: out + (err ? `\n[stderr] ${err}` : '') })
      })
    })
  }
}
