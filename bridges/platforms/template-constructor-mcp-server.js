import { createServer } from 'http'
import { spawn } from 'child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises'
import { join, dirname, resolve as pathResolve } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'
import { handleMcpHandshake } from './mcp-handshake.js'
import { publicTabUrls, publicProjectsUrl } from './site-url.js'

// ── Frozen Template Constructor MCP server (L2, port 3224) ──────────────────
// Any of the 6 agents adds a whole STRUCTURE (news / blog / documentation / …) by
// COMPOSING it from the Frozen Template Constructor — vetted frozen bricks assembled
// by file copy + token substitution, ZERO code generation. Tools:
//   owner_template_list_primitives      — read-only basis (registry) for matching.
//   owner_template_compose_structure    — mutating; §8.2 confirm via dry_run.
//   owner_template_compose_project_page — mutating (step 178); a Projects-layer
//     starter page from the mount-based project-page primitive, outside [lang].
//   owner_template_list_groups / owner_template_update_group — group manifests.
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
          menus: { type: 'object', description: 'Menu placement (registration metadata, emitted into _data/group.ts for the site menu system). Slots top|footer|left|right, each { enabled:boolean, order:number }. Default every slot disabled, order 10 (explicit opt-in). NOT a Slot A/B property.' },
          children_as_dropdown: { type: 'boolean', description: 'Group manifest flag (default false). true → the menu expands the group child pages as a dropdown; false → the button navigates to the group index route.' },
          dry_run: { type: 'boolean', description: 'true → preview without writing (§8.2). false/omit → compose.' },
        },
      },
    },
    {
      name: 'owner_template_compose_project_page',
      description:
        'Compose the starter interface of a PROJECT (the Projects layer: a private application level for ' +
        'the architect / project administrator — an automation or internal tool, "an n8n for one single ' +
        'task") from the frozen project-page primitive — file copy + token substitution, NO code ' +
        'generation. The page carries a description block, an interactive react-flow process diagram ' +
        '(driven by declarative data), a cron-queue table and a results table (empty until the cron ' +
        'infrastructure fills them). It mounts OUTSIDE [lang] into app/(projects)/projects/<category>/' +
        '<project>/; access (architect+manager) and language (site default, monolingual) are INHERITED ' +
        'from the zone layout. The folder name IS the registry: after a rebuild the project appears in ' +
        'the account drawer Projects accordion automatically. Use this for PRIVATE owner tools — a PUBLIC ' +
        'page group is owner_template_compose_structure instead.\n\n' +
        'CONFIRM FIRST (§8.2): call dry_run=true to preview + show the owner, get explicit confirmation, ' +
        'THEN call without dry_run. cron/integrations are RECORDED in the project README declaration only ' +
        '(env keys are materialized later via the env setter + rebuild). Finishing the diagram/tables for ' +
        'the real project is a coding-agent handoff on _data/flow.ts, _data/description.ts, ' +
        '_lib/project-data.ts — never a template change.',
      inputSchema: {
        type: 'object',
        required: ['category', 'project'],
        properties: {
          category: { type: 'string', enum: ['automation', 'fractera-pages', 'personal', 'other'], description: 'Existing projects category (fixed English identifiers).' },
          project: { type: 'string', description: 'Project slug, kebab-case English identifier — becomes the folder name (the registry) and the URL /projects/<category>/<project>. Never localized.' },
          title: { type: 'string', description: 'Human project name shown on the page (default: the slug, title-cased).' },
          purpose: { type: 'string', description: 'Why the project exists (description block). Placeholder if omitted.' },
          automation: { type: 'string', description: 'What is automated. Placeholder if omitted.' },
          how: { type: 'string', description: 'How the automation works. Placeholder if omitted.' },
          cron: { type: 'boolean', description: 'The project will run cron processes (recorded in the README declaration; execution is the cron infrastructure, a later capability).' },
          integrations: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, envKeys: { type: 'array', items: { type: 'string' } } } }, description: 'External integrations with their env keys, e.g. [{"name":"exa.ai","envKeys":["EXA_API_KEY"]}]. Recorded in the README declaration.' },
          dry_run: { type: 'boolean', description: 'true → preview without writing (§8.2). false/omit → compose.' },
        },
      },
    },
    {
      name: 'owner_template_list_groups',
      description:
        'List EVERY composed content group in the slot and its manifest (slug, languages, roles, menu ' +
        'placement, childrenAsDropdown) — read-only. Use this to see all page groups before editing a ' +
        "group's path, access roles, language set, or menu placement. A group composed before the manifest " +
        'existed is returned with a derived envelope (hasManifest=false).',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'owner_template_update_group',
      description:
        'Edit an EXISTING content group — its path (slug), access roles, language set, and menu placement — ' +
        'by deterministic file edits, NO code generation. It rewrites the group manifest (_data/group.ts the ' +
        'site menu reads) and keeps the REAL artifacts in sync: the layout access gate for roles, the UI ' +
        'chrome for languages, the folder name for the path. Pass only the fields you want to change.\n\n' +
        'CONFIRM FIRST (§8.2): call dry_run=true to preview the plan + show the owner, get explicit ' +
        'confirmation, THEN call without dry_run. After it writes, the slot still needs a REBUILD ' +
        '(owner_deploy_rebuild_slot) to go live.',
      inputSchema: {
        type: 'object',
        required: ['tab'],
        properties: {
          tab: { type: 'string', description: 'Current group slug (kebab-case) to edit.' },
          slug: { type: 'string', description: 'New slug → renames the group folder (its URL path) + updates the manifest and parser-fs.' },
          roles: { type: 'string', description: 'Access shape — rewrites the layout gate. "off" (public) | "guest" (public+guest) | comma role list (e.g. "user,manager") | "all".' },
          languages: { type: 'array', items: { type: 'string' }, description: 'Final language set (BCP-47, en is base). Adds/removes the UI chrome files; must be within the app\'s declared set (add a new app language first).' },
          menus: { type: 'object', description: 'Menu placement to set: { top, footer, left, right }, each { enabled:boolean, order:number }. Only the slots you pass change.' },
          children_as_dropdown: { type: 'boolean', description: 'true → the menu expands the group child pages as a dropdown; false → the button navigates to the group index.' },
          unauthorized_redirect: { type: 'string', description: 'Fallback page for a visitor lacking the role (default "/"). Only used when roles is on.' },
          dry_run: { type: 'boolean', description: 'true → preview without writing (§8.2). false/omit → apply.' },
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
    // Projects layer (step 197): automations live in their OWN process dir (fractera-projects
    // :3003), not the slot — project-page composition targets it. PROJECTS_DIR overrides.
    this.projectsDir = process.env.PROJECTS_DIR ?? pathResolve(__dirname, '../../projects-app')
    this.emitter = join(this.appDir, '.agents/skills/compose-frozen-template/compose-frozen-template.mjs')
    this.manager = join(this.appDir, '.agents/skills/compose-frozen-template/manage-group.mjs')
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
    if (name === 'owner_template_compose_project_page') return this._composeProject(args)
    if (name === 'owner_template_list_groups') return this._listGroups()
    if (name === 'owner_template_update_group') return this._updateGroup(args)
    throw new Error(`Unknown tool: ${name}`)
  }

  // ── read all composed groups + their manifests (step 158) ──────────────────
  async _listGroups() {
    const { code, out } = await this._spawn('node', [this.manager, '--out', this.appDir, '--op', 'list'])
    const j = (() => { try { return JSON.parse(out.trim().split('\n').filter(Boolean).pop()) } catch { return null } })()
    if (code !== 0 || !j) throw new Error(`manage-group list failed (${code}): ${out.slice(-300)}`)
    return textResult(j)
  }

  // ── edit an existing group: path / roles / languages / menus / dropdown (step 158) ──
  async _updateGroup(args) {
    const tab = String(args.tab ?? '').trim()
    if (!/^[a-z][a-z0-9-]*$/.test(tab)) throw new Error('tab must be kebab-case')
    const cli = [this.manager, '--out', this.appDir, '--op', 'update', '--tab', tab]
    if (typeof args.slug === 'string' && args.slug.trim()) cli.push('--slug', args.slug.trim())
    if (typeof args.roles === 'string' && args.roles.trim()) cli.push('--roles', args.roles.trim())
    if (Array.isArray(args.languages) && args.languages.length) cli.push('--languages', args.languages.map(String).join(','))
    if (args.menus && typeof args.menus === 'object' && !Array.isArray(args.menus)) cli.push('--menus', JSON.stringify(args.menus))
    if (args.children_as_dropdown !== undefined) cli.push('--children-dropdown', args.children_as_dropdown === true ? 'true' : 'false')
    if (typeof args.unauthorized_redirect === 'string' && args.unauthorized_redirect) cli.push('--unauthorized-redirect', args.unauthorized_redirect)
    if (args.dry_run) cli.push('--dry-run')
    const { code, out } = await this._spawn('node', cli)
    const j = (() => { try { return JSON.parse(out.trim().split('\n').filter(Boolean).pop()) } catch { return null } })()
    if (code === 2 && j && j.ok === false) return textResult({ ok: false, error: j.error, advice: 'Fix the input and retry. Never inject a language outside the app set; rename targets must not already exist.' })
    if (code !== 0 || !j) throw new Error(`manage-group update failed (${code}): ${out.slice(-300)}`)
    if (!args.dry_run && j.ok) {
      const view_urls = (() => { try { return publicTabUrls(j.manifest?.slug ?? tab, j.manifest?.languages ?? ['en'], this.appEnvFile) } catch { return [] } })()
      return textResult({ ...j, view_urls })
    }
    return textResult(j)
  }

  // ── compose a Projects-layer project page from the mount-based primitive (step 178) ──
  async _composeProject(args) {
    const CATEGORIES = ['automation', 'fractera-pages', 'personal', 'other']
    const category = String(args.category ?? '').trim()
    if (!CATEGORIES.includes(category)) throw new Error(`category must be one of: ${CATEGORIES.join(', ')}`)
    const project = String(args.project ?? '').trim()
    if (!/^[a-z][a-z0-9-]*$/.test(project)) throw new Error('project must be kebab-case (English identifier — it becomes the folder name)')
    const title = (typeof args.title === 'string' && args.title.trim()) || project.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
    const cron = args.cron === true
    const integrations = Array.isArray(args.integrations)
      ? args.integrations
          .map(it => ({ name: String(it?.name ?? '').trim(), envKeys: Array.isArray(it?.envKeys) ? it.envKeys.map(String).map(s => s.trim()).filter(Boolean) : [] }))
          .filter(it => it.name)
      : []

    if (args.dry_run) {
      return textResult({
        preview: true,
        willCreate: {
          folder: `app/(projects)/projects/${category}/${project}/ (11 files: page + description + react-flow diagram + cron-queue and results tables + _meta + README declaration)`,
          access: 'architect+manager, inherited from the zone layout',
          language: 'monolingual (site default), outside [lang]',
          title, cron, integrations,
        },
        note: 'The real call refuses honestly if the category folder or a required npm dependency (@xyflow/react) is missing from the projects service dir (projects-app — step 197: projects compose there, not into the slot).',
        confirm_prompt:
          `Правильно ли я вас понимаю: собрать стартовую страницу проекта «${title}» — /projects/${category}/${project} ` +
          `(описание + react-flow диаграмма процессов + таблицы cron-очереди и результатов; доступ architect+manager; ` +
          `cron=${cron ? 'да' : 'нет'}, интеграций: ${integrations.length})? Диаграмма и таблицы — стартовые заглушки; ` +
          `доводка под реальный проект — отдельная задача кодинг-агента. Повторите вызов без dry_run для подтверждения.`,
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
      // step 197: projects compose into the PROJECTS service dir, not the slot.
      const cli = [this.emitter, '--store', storeDir, '--out', this.projectsDir, '--primitive', 'project-page', '--category', category, '--project', project, '--title', title]
      for (const k of ['purpose', 'automation', 'how']) if (typeof args[k] === 'string' && args[k].trim()) cli.push(`--${k}`, args[k].trim())
      if (cron) cli.push('--cron', 'true')
      if (integrations.length) cli.push('--integrations', JSON.stringify(integrations))
      const { code, out } = await this._spawn('node', cli)
      const last = (() => { try { return JSON.parse(out.trim().split('\n').filter(Boolean).pop()) } catch { return null } })()
      if (last && last.refused) return textResult({ refused: true, axis: last.axis, detail: last.detail, advice: 'Fix the input and retry: the category must be an existing folder; a missing npm dependency must be added to the slot package.json (+ rebuild) first.' })
      if (code !== 0 || !last || !last.composed) throw new Error(`composer exited ${code}: ${out.slice(-400)}`)
      // mode-aware view URL on the PROJECTS service (:3003 / projects.<apex>; monolingual, no [lang])
      const view_url = (() => { try { return `${publicProjectsUrl(this.appEnvFile)}/projects/${category}/${project}` } catch { return '' } })()
      return textResult({ ...last, view_url, next: 'Now REBUILD the projects service (POST :3002/api/deploy with {"target":"projects"}) so the page is live — NOT the app slot; the account drawer Projects entry links into this service. Finishing the diagram/description/tables for the real project is a coding-agent handoff (_data/flow.ts, _data/description.ts, _lib/project-data.ts).' })
    } finally {
      await rm(storeDir, { recursive: true, force: true }).catch(() => {})
    }
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
    // step 158: menu placement (registration metadata) + child-dropdown flag — optional overrides.
    const menus = (args.menus && typeof args.menus === 'object' && !Array.isArray(args.menus)) ? args.menus : undefined
    const childrenAsDropdown = args.children_as_dropdown === true

    if (args.dry_run) {
      return textResult({
        preview: true,
        match: { source, depth, rendering, i18n: 'multi', roles },
        willCreate: { router: `app/[lang]/${tab}/ (+ engine if absent)`, documents: samples, format, languages, labels, menus: menus ?? 'all disabled (order 10)', childrenAsDropdown },
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
      if (menus) cli.push('--menus', JSON.stringify(menus))
      if (childrenAsDropdown) cli.push('--children-dropdown', 'true')
      const { code, out } = await this._spawn('node', cli)
      const refusal = (() => { try { const last = out.trim().split('\n').filter(Boolean).pop(); const j = JSON.parse(last); return j.refused ? j : null } catch { return null } })()
      if (refusal) return textResult({ refused: true, axis: refusal.axis, detail: refusal.detail, advice: 'No frozen primitive fits this axis. Offer to harvest a new brick (only if proven + repeating) or use classic development.' })
      if (code !== 0) throw new Error(`composer exited ${code}: ${out.slice(-400)}`)
      // mode-aware PUBLIC view URLs (secure → https://<domain>/<lang>/<tab>, IP → http://<ip>:3000/...).
      // The composer already wrote _list.generated + package.json scripts; the slot still needs a REBUILD
      // (owner_deploy_rebuild_slot) before these are live.
      const view_urls = (() => { try { return publicTabUrls(tab, languages, this.appEnvFile) } catch { return [] } })()
      return textResult({ composed: true, tab, source, depth, rendering, roles, format, languages, labels, samples, menus: menus ?? 'all disabled (order 10)', childrenAsDropdown, view_urls, emitter_output: out.trim().split('\n').slice(-12), next: 'Now REBUILD the slot with owner_deploy_rebuild_slot so the change is live; then the view_urls above will work. Do NOT run npm/gen:lists/tsc yourself; do NOT curl an internal/plain-HTTP host.' })
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
