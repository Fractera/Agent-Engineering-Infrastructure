import { createServer } from 'http'
import { spawn } from 'child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises'
import { readFileSync } from 'fs'
import { join, dirname, resolve as pathResolve } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'
import { handleMcpHandshake } from './mcp-handshake.js'
import { publicSiteUrl } from './site-url.js'

// ── Content Orchestrator MCP server (L2, port 3227) ─────────────────────────
// The FROZEN PROCESS for content operations. The agent passes only an INTENT
// ("a page about Apple"); this orchestrator DECOMPOSES it by the slot's STATE
// (does the section exist?) into dependent sub-steps and runs EACH through the
// full development-step lifecycle, with the Deployment record as a GATE:
//   open-step → execute → deploy → verify → RECORD (gate) → close-step
// A step CANNOT close without a confirmed deployment_records row (the Vercel
// invariant). A weak model cannot reorder or skip — the process is frozen.
// The decompose+cycle logic lives in the slot emitter orchestrate-content-by-steps.mjs
// (self-sufficient for a lone CLI agent); this bridge spawns it with the deploy/data
// secrets in env. Reuses compose (section) + create-page (clone) from steps 147/154.
// owner_content_orchestrate — mutating; §8.2 confirm via dry_run. L2 only.

const __dirname = dirname(fileURLToPath(import.meta.url))
const textResult = data => ({ content: [{ type: 'text', text: JSON.stringify(data) }] })

function toolsSchema() {
  return [
    {
      name: 'owner_content_orchestrate',
      description:
        'Do a content request the RIGHT way end-to-end: you pass only an INTENT (what the owner wants), and ' +
        'this orchestrator DECOMPOSES it by the site\'s state and runs each piece through the full step ' +
        'lifecycle — open a development step, do it, deploy, RECORD the deployment, then close the step. The ' +
        'deployment record is a GATE: a step never closes without it (like Vercel never skips a deploy record).\n\n' +
        'You do NOT chain the tools yourself and you do NOT generate content/code. Just give: action ' +
        '("add-page" for one page about a topic, or "create-section" for a new section / several test posts), a ' +
        'topic, optional tab (default news). If the section does not exist yet, the orchestrator first creates it ' +
        '(a sub-step), then adds the page (a second sub-step) — each deployed and recorded.\n\n' +
        'CONFIRM FIRST (§8.2): call dry_run=true to show the decomposition (the sub-steps it will run) and get ' +
        'the owner\'s ok, THEN call without dry_run. It returns the chronology: steps opened/closed, deployment ' +
        'record ids, and the public URLs.',
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add-page', 'create-section'], description: 'SINGLE intent: add-page = one page about a topic (creates the section first if missing). create-section = a new section / N test posts. For a COMPOUND multi-group request, use plan[] instead.' },
          plan: {
            type: 'array',
            description: 'COMPOUND frozen request in ONE intent (step 167): an array of group specs. Decomposed FLAT into fine sub-steps (create-section → set-group menus/roles → add-page), each run through open→execute→deploy→RECORD→close, in order. Use this for a multi-group request instead of many calls. Omit for a single action.',
            items: { type: 'object', properties: {
              tab: { type: 'string', description: 'Section slug (kebab): news/blog/documentation/…' },
              format: { type: 'string', enum: ['news', 'blog', 'document'], description: 'Section preset (default news).' },
              samples: { type: 'integer', description: 'Stub posts for the section (default 2).' },
              menus: { type: 'object', description: 'Menu placement — { top|footer|left|right: { enabled, order } } (step 158).' },
              roles: { description: 'Access tier: "public"/"all"/"everyone" all mean VISIBLE TO EVERYONE (no gate); a role or csv like "user" gates to signed-in holders; "guest" = public+guest (step 158/161).' },
              languages: { type: 'array', items: { type: 'string' }, description: 'Section languages (default = the slot set).' },
              pages: { type: 'array', items: { type: 'string' }, description: 'Extra named stub pages (kebab topics, ENGLISH identifiers). An EXISTING page = modify = refused (coding scenario).' },
              admin: { type: 'boolean', description: 'MANDATORY owner decision: does this group get an ADMIN PANEL? Absent → the tool returns needs_input with the exact question to relay; ask the owner, then set it.' },
              dashboard: { type: 'boolean', description: 'MANDATORY owner decision: does this group get USER DASHBOARDS (dashboard/[userId])? Absent → needs_input, same as admin.' },
            } },
          },
          owner_lang: { type: 'string', enum: ['en', 'ru'], description: 'Language of the owner dialogue — the order-sheet/question texts come back in it (default en).' },
          approve: { type: 'string', description: 'The order-sheet token (os-…) from the PREVIOUS dry_run, after the owner explicitly confirmed the shown lines. A plan run WITHOUT a matching token is refused — dry_run first, show, confirm, then pass it. RESUME (step 172): if a previous run of the SAME plan died mid-queue, calling again with the same plan + same token resumes it — the queue lives on disk in NEW-STEPS, completed sub-steps are skipped.' },
          topic: { type: 'string', description: 'What the page is about (required for add-page), e.g. "apple". Becomes the page slug.' },
          tab: { type: 'string', description: 'Section slug (default news). news/blog/documentation.' },
          format: { type: 'string', enum: ['news', 'blog', 'document'], description: 'Section preset when creating it (default news).' },
          samples: { type: 'integer', description: 'For create-section: how many test/placeholder posts (default 2). These stubs ARE the test posts.' },
          languages: { type: 'array', items: { type: 'string' }, description: 'Section languages (default = the slot\'s configured set).' },
          platform: { type: 'string', description: 'The agent doing the work (for the Deployment record). Default hermes.' },
          model: { type: 'string', description: 'Model id (for the Deployment record).' },
          app_shell_auth: { type: 'string', enum: ['left', 'right'], description: 'Drawer side for the visitor login (default left). If any group in the plan is role-gated, the pipeline auto-enables app-shell login so gated content is reachable — this only picks the side.' },
          dry_run: { type: 'boolean', description: 'true → show the decomposition plan without writing (§8.2). false/omit → run it.' },
        },
      },
    },
    {
      name: 'owner_perceive_workspace',
      description:
        'SEE what actually exists in the workspace BEFORE you act. Returns the LIVE tree of the running site — ' +
        'every content section and the real pages inside it (news, blog, documentation, …), plus declared (not-' +
        'yet-built) nodes and open tasks. This is the SAME filesystem scan that powers the /architecture page, so ' +
        'it shows the truth on disk — NOT the deployment journal. Read-only; nothing is changed.\n\n' +
        'ALWAYS call this first when the owner asks "what do I have / list my pages / what news exists / change ' +
        'this existing page / delete X". Do NOT answer those from the deployment record (that is a history log of ' +
        'deploys, not a catalog of content) or from memory (it goes stale). Pass scope to narrow to one section ' +
        '(e.g. scope="news"); omit it for the whole map.',
      inputSchema: {
        type: 'object',
        properties: {
          scope: { type: 'string', description: 'Optional section slug to narrow to (e.g. "news"). Omit for the full workspace map.' },
        },
      },
    },
    {
      name: 'owner_report_blocker_step',
      description:
        'Record a task as an OPEN development step (a numbered handoff record) — the FALLBACK when the work ' +
        'cannot be delegated right now. Use it in two cases: (1) real code/content work but NO coding agent ' +
        'is signed into a subscription — offer this as option 2 (save it, return later) after giving the calm ' +
        'readiness status, NEVER as "the platform is broken"; (2) one of your OWN tools errored in a way that ' +
        'needs code analysis (MODULE_NOT_FOUND, a 500, a build/tsc failure) — a developer repairs that. You ' +
        '(Hermes) never program. For real code work when an agent IS available, DELEGATE instead (confirm the ' +
        'payload, check readiness, delegate-task) — this tool is the record-and-wait fallback, not a substitute ' +
        'for delegation. The step is left OPEN so a coding agent can pick it up cold later.',
      inputSchema: {
        type: 'object',
        required: ['task'],
        properties: {
          task: { type: 'string', description: 'The task the owner asked you for, in plain words.' },
          title: { type: 'string', description: 'Short step title (default "Content task needs a coding agent").' },
          mcp_tool: { type: 'string', description: 'If a tool errored: the MCP tool name you were using.' },
          sub_task: { type: 'string', description: 'If a tool errored: the sub-task you were doing.' },
          error: { type: 'string', description: 'If a tool errored: the exact error text.' },
        },
      },
    },
  ]
}

export class ContentOrchestratorMcpServer {
  constructor({ port, secret, dataUrl, dataSecret, adminUrl, appDir, deploySecretFile }) {
    this.port = port
    this.secret = secret
    this.dataUrl = dataUrl ?? 'http://127.0.0.1:3300'
    this.dataSecret = dataSecret ?? process.env.DATA_SECRET ?? ''
    this.adminUrl = adminUrl ?? 'http://127.0.0.1:3002'
    this.appDir = appDir ?? pathResolve(__dirname, '../../app')
    this.deploySecretFile = deploySecretFile ?? '/opt/fractera/bridges/app/.env.local'
    this.orchestrator = join(this.appDir, '.agents/skills/orchestrate-content-by-steps/orchestrate-content-by-steps.mjs')
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
      if (req.method === 'GET' && req.url === '/health') { res.end(JSON.stringify({ ok: true, server: 'content-orchestrator' })); return }
      if (req.method !== 'POST') { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return }
      let body = ''
      req.on('data', c => { body += c })
      req.on('end', () => { try { this._handle(JSON.parse(body), res) } catch { res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' })) } })
    })
    server.listen(this.port, '127.0.0.1', () => console.log(`[mcp:content-orchestrator] http://127.0.0.1:${this.port}`))
  }

  _handle(rpc, res) {
    const { id, method, params } = rpc
    const ok = r => res.end(JSON.stringify({ jsonrpc: '2.0', id, result: r }))
    const fail = (c, m) => res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: c, message: m } }))
    if (handleMcpHandshake(rpc, res, 'fractera-content-orchestrator-bridge')) return
    if (method === 'tools/list') return ok({ tools: toolsSchema() })
    if (method === 'tools/call') return this._call(params?.name, params?.arguments ?? {}).then(ok).catch(e => fail(-32603, e.message))
    fail(-32601, `Method not found: ${method}`)
  }

  async _call(name, args) {
    if (name === 'owner_content_orchestrate') return this._orchestrate(args)
    if (name === 'owner_perceive_workspace') return this._perceive(args)
    if (name === 'owner_report_blocker_step') return this._reportBlocker(args)
    throw new Error(`Unknown tool: ${name}`)
  }

  // Read-only situational awareness for Hermes: reuse the SAME live filesystem
  // scan that powers /service/architecture (GET …/architecture/signature → scanTree()).
  // That endpoint moved to the admin app (:3002) in step 170, but its fs-scan reads the
  // SLOT filesystem via slotRoot(), so it still enumerates every content post (each is
  // its own route folder with a page.tsx → builtExtra). We just regroup into a compact map.
  async _perceive(args) {
    const scope = typeof args.scope === 'string' && args.scope.trim() ? args.scope.trim() : null
    let sig
    try {
      const r = await fetch(`${this.adminUrl}/api/project/default/architecture/signature`,
        { headers: { 'X-Agent-Identity': 'hermes' }, signal: AbortSignal.timeout(15000) })
      if (!r.ok) throw new Error(`signature scan returned ${r.status}`)
      sig = await r.json()
    } catch (e) {
      throw new Error(`could not read the live workspace (is the admin service running on :3002?): ${e.message}`)
    }
    const collections = {}
    const pages = []
    for (const { href } of (sig.builtExtra ?? [])) {
      const segs = String(href).split('/').filter(Boolean)
      if (segs.length >= 2) {
        const tab = segs[0], slug = segs.slice(1).join('/')
        ;(collections[tab] ??= []).push({ slug, href, title: this._postTitle(tab, slug) })
      } else if (segs.length === 1) {
        pages.push({ slug: segs[0], href, title: this._postTitle(null, segs[0]) })
      }
    }
    const declared = (sig.requested ?? []).map(d => ({ slug: d.slug, kind: d.kind, title: d.title, status: d.status }))
    const tasks = Object.entries(sig.tasksByPath ?? {})
      .filter(([, v]) => v && v.count > 0)
      .map(([path, v]) => ({ path, openTasks: v.count }))
    const map = scope
      ? { scope, posts: collections[scope] ?? [], tasks: tasks.filter(t => t.path.startsWith(`/${scope}`)) }
      : { collections, pages, declared, tasks }
    return textResult({
      source: 'live-filesystem-scan (same as /architecture, not the deployment journal)',
      ...map,
      note: scope
        ? `Section "${scope}" has ${(collections[scope] ?? []).length} page(s). This is what is REALLY on the site now.`
        : `${Object.keys(collections).length} section(s), ${Object.values(collections).reduce((n, a) => n + a.length, 0)} page(s) total. To act on existing content, work from THIS list.`,
    })
  }

  // Best-effort title: posts are co-located static folders app/[lang]/<tab>/<slug>/_data/en.ts.
  // Cheap regex read; on any miss return null and the caller falls back to the slug.
  _postTitle(tab, slug) {
    try {
      const rel = tab ? join('app', '[lang]', tab, slug, '_data', 'en.ts') : join('app', '[lang]', slug, '_data', 'en.ts')
      const src = readFileSync(join(this.appDir, rel), 'utf8')
      const m = /\btitle\s*:\s*(['"`])([\s\S]*?)\1/.exec(src)
      return m ? m[2].trim() : null
    } catch { return null }
  }

  async _reportBlocker(args) {
    if (!args.task || !String(args.task).trim()) throw new Error('task is required (what the owner asked for)')
    const cli = [this.orchestrator, '--out', this.appDir, '--action', 'report-blocker', '--task', String(args.task)]
    if (args.title) cli.push('--blocker-title', String(args.title))
    if (args.mcp_tool) cli.push('--mcp-tool', String(args.mcp_tool))
    if (args.sub_task) cli.push('--sub-task', String(args.sub_task))
    if (args.error) cli.push('--error', String(args.error))
    const { code, out } = await this._spawn(process.execPath, cli, { ...process.env })
    const last = (() => { try { return JSON.parse(out.trim().split('\n').filter(Boolean).pop()) } catch { return null } })()
    if (code !== 0) throw new Error(`blocker report exited ${code}: ${out.slice(-300)}`)
    return textResult({ ...(last ?? { ok: true }), advice: 'Tell the owner plainly: this needs a coding agent. Ask them to activate one (Claude Code / Codex / Gemini / Qwen / Kimi); it will read the step you just recorded and finish the work.' })
  }

  _readDeploySecret() {
    try {
      for (const line of readFileSync(this.deploySecretFile, 'utf8').split('\n')) {
        const m = /^\s*(?:export\s+)?DEPLOY_SECRET\s*=\s*(.+)\s*$/.exec(line)
        if (m) return m[1].trim().replace(/^["']|["']$/g, '')
      }
    } catch { /* missing */ }
    return ''
  }

  async _materializeStore(work) {
    const r = await fetch(`${this.dataUrl}/frozen-templates/tree`, { headers: { 'X-Agent-Identity': 'hermes', ...(this.dataSecret ? { 'X-Data-Secret': this.dataSecret } : {}) }, signal: AbortSignal.timeout(15000) })
    if (!r.ok) throw new Error(`store tree fetch failed (${r.status})`)
    const { files } = await r.json()
    if (!files || !files['registry.json']) throw new Error('store returned no template files')
    const storeDir = join(work, 'store')
    for (const [rel, content] of Object.entries(files)) { const dest = join(storeDir, rel); await mkdir(dirname(dest), { recursive: true }); await writeFile(dest, content, 'utf8') }
    return storeDir
  }

  async _orchestrate(args) {
    const isPlan = Array.isArray(args.plan) && args.plan.length > 0
    const action = String(args.action ?? '')
    if (!isPlan && !['add-page', 'create-section'].includes(action)) throw new Error('action must be add-page|create-section, or pass plan[] for a compound request')
    const tab = isPlan ? '' : ((typeof args.tab === 'string' && args.tab) || 'news')
    if (tab && !/^[a-z][a-z0-9-]*$/.test(tab)) throw new Error('tab must be kebab-case')
    const topic = typeof args.topic === 'string' ? args.topic : ''
    if (!isPlan && action === 'add-page' && !topic.trim()) throw new Error('topic is required for add-page')

    const publicBase = (() => { try { return publicSiteUrl(this.appEnvFile) } catch { return '' } })()
    const work = await mkdtemp(join(tmpdir(), 'content-orch-'))
    try {
      const cli = [this.orchestrator, '--out', this.appDir, '--admin-url', this.adminUrl, '--data-url', this.dataUrl]
      if (isPlan) {
        cli.push('--plan', JSON.stringify(args.plan))
      } else {
        cli.push('--action', action, '--tab', tab)
        if (topic) cli.push('--topic', topic)
        if (['news', 'blog', 'document'].includes(args.format)) cli.push('--format', args.format)
        if (Number.isFinite(args.samples)) cli.push('--samples', String(Math.max(1, Math.min(10, Math.trunc(args.samples)))))
        if (Array.isArray(args.languages) && args.languages.length) cli.push('--languages', args.languages.map(String).join(','))
      }
      if (publicBase) cli.push('--public-url', publicBase)
      if (args.platform) cli.push('--platform', String(args.platform))
      if (args.model) cli.push('--model', String(args.model))
      if (['left', 'right'].includes(args.app_shell_auth)) cli.push('--auth-side', args.app_shell_auth)
      if (['en', 'ru'].includes(args.owner_lang)) cli.push('--owner-lang', args.owner_lang)
      if (typeof args.approve === 'string' && args.approve) cli.push('--approve', args.approve)
      if (args.dry_run) cli.push('--dry-run')

      // The frozen store (compose needs it). A plan almost always creates sections; a single create-section
      // always needs it; add-page needs it only if the section is missing (the emitter validates).
      if (isPlan || action === 'create-section' || action === 'add-page') {
        try { const storeDir = await this._materializeStore(work); cli.push('--store', storeDir) } catch (e) { if (isPlan || action === 'create-section') throw e }
      }

      const env = { ...process.env, DEPLOY_SECRET: this._readDeploySecret(), DATA_SECRET: this.dataSecret }
      const { code, out } = await this._spawn(process.execPath, cli, env)
      const last = (() => { try { return JSON.parse(out.trim().split('\n').filter(Boolean).pop()) } catch { return null } })()

      // Operation gate (step 167): the emitter refused a modify-existing / real-content request → route out.
      if (last && last.ok === false && last.gate === 'operation') {
        return textResult({ ok: false, gate: 'operation', scenario: 'REAL-DEVELOPMENT', refused: last.refused, message: last.message,
          advice: 'This is real development (modify existing / real content), NOT frozen assembly. Say so plainly. You never do it yourself — DELEGATE to a coding agent: confirm the payload, check readiness (choose-agent), delegate (delegate-task). If no agent is signed into a subscription, that is NOT a platform failure — give the calm status (present X / with subscription Y) and offer two options: activate the agents and retry, or save it as a step with owner_report_blocker_step.' })
      }
      // Mandatory-questions gate (step 167): admin/dashboard answers are missing → relay the EXACT
      // question texts to the owner (use `explain` if they ask what it is), fill the plan, dry_run again.
      if (last && last.needs_input) {
        return textResult({ ...last, advice: 'Ask the owner each `question` VERBATIM (one per group/field); if they ask what it means, answer with `explain` VERBATIM. Then set the boolean admin/dashboard fields on those plan groups and call dry_run again. Do NOT guess the answers.' })
      }
      // Approve gate (step 167): a real plan run without the confirmed order-sheet token is refused.
      if (last && last.ok === false && last.gate === 'approve') {
        return textResult({ ...last, advice: 'Run dry_run first, show the returned order_sheet lines to the owner VERBATIM, get an explicit yes, then call again passing that dry_run\'s approve token. Never invent or reuse a token.' })
      }

      if (args.dry_run) {
        const steps = Array.isArray(last?.plan) ? last.plan : []
        // Compound plan with an order sheet (step 167): the sheet IS the confirmation surface —
        // relay its lines verbatim; the confirm_instruction carries the exact protocol + token.
        if (isPlan && last?.order_sheet) {
          return textResult({ preview: true, mode: 'plan', groups: args.plan.length, order_sheet: last.order_sheet,
            plan: steps, note: last?.note,
            advice: 'Show the owner every order_sheet line VERBATIM (plus implied lines). On edits — adjust plan[] and dry_run again. On an explicit yes — call again with approve set to the order_sheet id, and relay announce_text verbatim as you start.' })
        }
        return textResult({ preview: true, mode: isPlan ? 'plan' : 'single', action: isPlan ? undefined : action, tab: isPlan ? undefined : tab, topic: isPlan ? undefined : topic,
          decomposition: steps.length ? steps : (last?.plan ?? last), sectionExists: last?.sectionExists,
          confirm_prompt: isPlan
            ? `Правильно ли я понимаю: собрать ${args.plan.length} групп(ы) из замороженных шаблонов одним плоским конвейером? Под-шагов: ${steps.length} — ${steps.map(s => s.name).join('; ')}. Каждый: открыть шаг → собрать → развернуть → ЗАПИСАТЬ развёртывание (обязательно) → закрыть, строго по порядку. Повторите без dry_run для запуска.`
            : `Правильно ли я понимаю: ${action} «${tab}${topic ? '/' + topic : ''}»? Под-шаги: ${steps.map(s => s.name).join('; ')}. Каждый: открыть шаг → собрать → развернуть → ЗАПИСАТЬ развёртывание (обязательно) → закрыть. Повторите без dry_run для подтверждения.` })
      }
      if (last && last.ok === false) {
        // MATERIALIZE-FIRST (step 172): the approved queue is on disk BEFORE execution, so a failure
        // (or a dead process) loses nothing — relay the resume contract to the model verbatim.
        return textResult({ ok: false, mode: isPlan ? 'plan' : 'single', action, tab, topic, failedStage: last.failedStage, detail: last.detail, stepKeptOpen: last.stepKeptOpen,
          order_sheet_id: last.order_sheet_id, queue_persisted: last.queue_persisted, remaining: last.remaining, resume: last.resume, chronology: last.chronology,
          note: 'A sub-step failed; per the Vercel invariant the step was NOT closed (no deployment record → stays open). The rest of the approved queue is PERSISTED in NEW-STEPS (step 172): to resume — even in a new session — call this tool again with the SAME plan and the SAME approve token; completed sub-steps are skipped automatically. Do not hand-fix content — repair the tool if it is broken.' })
      }
      if (code !== 0) throw new Error(`orchestrator exited ${code}: ${out.slice(-400)}`)
      return textResult({ ...(last ?? { ok: true }), note: 'Done end-to-end: each sub-step opened a development step, deployed, recorded a deployment, and closed. See chronology + steps.' })
    } finally {
      await rm(work, { recursive: true, force: true }).catch(() => {})
    }
  }

  _spawn(cmd, cli, env) {
    return new Promise((res, rej) => {
      const p = spawn(cmd, cli, { cwd: this.appDir, env })
      let out = '', err = ''
      p.stdout.on('data', d => { out += d }); p.stderr.on('data', d => { err += d })
      p.on('error', rej)
      p.on('close', code => res({ code, out: out + (err ? `\n[stderr] ${err}` : '') }))
    })
  }
}
