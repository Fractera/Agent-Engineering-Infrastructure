import { createServer } from 'http'
import { spawn } from 'child_process'
import { join } from 'path'
import { handleMcpHandshake } from './mcp-handshake.js'

// ── Projects Router MCP server (L2, port 3229) ──────────────────────────────
// The TOP-LEVEL fork of the Projects layer (step 180, master plan 174). BEFORE any
// pipeline runs, an owner's wish is segmented: PAGES (public product surface, any
// role) vs PROJECTS (private application levels for the architect/manager). This
// router sits ONE LEVEL ABOVE the task-scenario-router (step 167): the pages branch
// continues into that router (FROZEN-ASSEMBLY ↔ REAL-DEVELOPMENT); the projects
// branch continues into the survey below, then the declaration (P3) / project-page
// compose (:3224, P5) / coding-agent handoff.
//
// Layer manifest (must travel with every tool of this layer): Fractera agents do not
// run an automation once on request — they build a platform for developing REPEATABLE
// automations: standardized reuse, a visual interface, input and result data in the
// local DB and vector memory, quick switching from the UI. Hermes plus a coding agent
// build a finished-cycle tool — an "n8n for one single task": the owner does not
// recreate the task, they open it in the UI, run it and track the result.
//
// The two router/survey tools are ADVISORY — zero mutations, nothing is written
// anywhere. The verdict and the survey answers travel through the EXISTING channels:
// the P3 declaration (cron + integrations fields), the P5 compose call, and the
// build-time env setter of step 143. Route fixation is structural, not behavioral: an
// ambiguous request gets needs_input + the verbatim question, and the final verdict is
// only issued to a call that carries the owner's explicit confirmed_choice.
//
// The THIRD tool (step 184 D5) — owner_projects_orchestrate_decomposition — is the
// MCP face of the frozen project process: it spawns the slot's self-sufficient engine
// `.agents/skills/orchestrate-project-by-steps/orchestrate-project-by-steps.mjs`
// (materialize-first decomposition: validates the DAG, GATES on spec completeness,
// then writes the project-root README + one spec step + one coder-handoff step per
// node BEFORE any development). It MUTATES the slot on a real run, so it follows the
// order-sheet protocol: dry_run first, the owner confirms the sheet verbatim, then the
// same call with the approve token. SINGLE-LINE JSON (step 158). Bearer gate
// (step 135) as on every bridge. L2 only.

const textResult = data => ({ content: [{ type: 'text', text: JSON.stringify(data) }] })

const VERBATIM_QUESTION_RU =
  'Хотите, чтобы этот сервис был публичным для внешних пользователей, или он предназначен для вашего ' +
  'собственного использования (автоматизация / личный сервис)?'
const VERBATIM_QUESTION_EN =
  'Do you want this service to be public for external users, or is it intended for your own use ' +
  '(an automation / a personal service)?'

// Keyword banks are deterministic on purpose: the tool never guesses semantics the
// model should own — it scores explicit signals and asks when they do not decide.
const PROJECT_SIGNALS = [
  'автоматиз', 'по расписан', 'расписани', 'крон', 'cron', 'для себя', 'для собствен', 'собственного использования',
  'личн', 'внутренн', 'приватн', 'только я', 'сам буду', 'монитор', 'напомина', 'интеграц', 'бот',
  'automat', 'schedul', 'private', 'internal', 'my own', 'for myself', 'remind', 'monitor', 'integrat',
  'scrape', 'parse', 'парс', 'webhook', 'управлен страниц', 'manage pages',
]
const PAGES_SIGNALS = [
  'публичн', 'посетител', 'для клиент', 'пользовател сайта', 'блог', 'новост', 'лендинг', 'витрин',
  'добав страниц', 'новая страниц', 'новую страниц', 'раздел сайта', 'индексац',
  'public', 'visitor', 'landing', 'blog', 'news section', 'storefront', 'add a page', 'new page', 'audience', 'seo',
]
const CATEGORY_SIGNALS = {
  automation: ['автоматиз', 'расписан', 'cron', 'крон', 'api', 'интеграц', 'бот', 'монитор', 'парс', 'публикова',
    'automat', 'schedul', 'integrat', 'webhook', 'rss', 'telegram', 'youtube', 'monitor', 'scrape', 'parse', 'publish'],
  'fractera-pages': ['страниц', 'контент', 'меню', 'секци', 'раздел', 'page', 'content', 'menu', 'section', 'seo'],
  personal: ['личн', 'напомина', 'задач', 'привычк', 'заметк', 'эффективн', 'план дня',
    'remind', 'todo', 'habit', 'note', 'personal', 'efficien'],
}

// "личн"/"лично"/"личный" are substrings of "публичн…" — private-side banks score against
// text with the pages word masked, so a public wish never yields a false private hit.
function score(text, bank, { maskPublic = false } = {}) {
  let t = text.toLowerCase()
  if (maskPublic) t = t.replace(/публичн[а-яё]*/g, ' ')
  const hits = bank.filter(k => t.includes(k))
  return { n: hits.length, hits }
}

function classifyCategory(text) {
  let best = 'other', bestN = 0
  for (const [cat, bank] of Object.entries(CATEGORY_SIGNALS)) {
    const { n } = score(text, bank, { maskPublic: true })
    if (n > bestN) { best = cat; bestN = n }
  }
  return best
}

// Env-key normalization — the same convention step 176 records in declarations:
// "youtube api key" → "YOUTUBE_API_KEY".
function toEnvKey(s) {
  return String(s).trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function toolsSchema() {
  return [
    {
      name: 'owner_projects_route_request',
      description:
        'The TOP-LEVEL fork for any "I want a service / tool / automation" wish: segment it into PAGES ' +
        '(public product surface — any role can see it) vs PROJECTS (a private application level for the ' +
        'architect/manager under /projects/<category>/<slug>). Call this BEFORE the task-scenario-router ' +
        '(FROZEN vs REAL-DEV) — that router handles the pages branch AFTER this fork.\n\n' +
        'Layer manifest: Fractera agents do not run an automation once on request — they build a platform ' +
        'for developing REPEATABLE automations (standardized reuse, a visual interface, input/result data ' +
        'in the local DB and vector memory, quick switching from the UI). Hermes plus a coding agent build ' +
        'a finished-cycle tool — an "n8n for one single task": the owner does not recreate the task, they ' +
        'open it in the UI, run it and track the result.\n\n' +
        'Protocol (the route is NOT fixed without the owner\'s explicit answer):\n' +
        '  1) call with { request } — the raw wish, verbatim, any language;\n' +
        '  2) if it returns needs_input — ask the owner the returned question VERBATIM (translate only if ' +
        'the dialogue language differs, preserving the meaning exactly) and wait for an explicit answer;\n' +
        '  3) if it returns proposed_route — still confirm with the owner (confirm_prompt) before fixing;\n' +
        '  4) re-call with { request, confirmed_choice } — only that call returns the fixed route and the ' +
        'next pipeline actions. Never skip the confirmation; never guess.\n' +
        'Read-only: nothing is written anywhere.',
      inputSchema: {
        type: 'object',
        required: ['request'],
        properties: {
          request: { type: 'string', description: 'The owner\'s wish, verbatim, in any language.' },
          confirmed_choice: {
            type: 'string', enum: ['public-pages', 'private-project'],
            description: 'The owner\'s EXPLICIT confirmed answer: public-pages = a public service for external users; private-project = for the owner\'s own use (automation / personal service). Only a call with this field fixes the route.',
          },
          category_hint: {
            type: 'string', enum: ['automation', 'fractera-pages', 'personal', 'other'],
            description: 'Optional: the project category if the owner already named it.',
          },
        },
      },
    },
    {
      name: 'owner_projects_survey_automation_needs',
      description:
        'The cron / external-integrations survey of the Projects layer — call it AFTER ' +
        'owner_projects_route_request fixed the route as private-project and BEFORE declaring/composing ' +
        'the project. Two-phase, read-only:\n' +
        '  1) call with {} — it returns the two questions to ask the owner verbatim ("will the project ' +
        'run cron processes?", "which external integrations?") plus the todo-list UX for integrations;\n' +
        '  2) re-call with the answers ({ cron, cron_intents, integrations } or ' +
        '{ owner_does_not_know:true }) — it normalizes them into the structure the downstream channels ' +
        'expect: cron intents for the project\'s cron.json (substrate runner, step 179), integrations ' +
        'with UPPER_SNAKE env keys for the P3 declaration, and materialization advice (env keys are ' +
        'written via the persist-env-var-with-rebuild channel, step 143 — never by this tool).\n' +
        'If the owner does not know, it returns defer_to_planning:true — at the planning stage the model ' +
        'is authorized to decide itself and create the records. Nothing is written anywhere by this tool.',
      inputSchema: {
        type: 'object',
        properties: {
          cron: { type: 'string', enum: ['yes', 'no', 'unknown'], description: 'Will the project run scheduled (cron) processes?' },
          cron_intents: {
            type: 'array',
            description: 'What should run and when (free-form is fine, e.g. "publish digest every morning at 9").',
            items: {
              type: 'object', required: ['title'],
              properties: {
                title: { type: 'string', description: 'What the scheduled job does.' },
                schedule: { type: 'string', description: 'When it runs — free-form or a 5-field cron expression.' },
              },
            },
          },
          integrations: {
            type: 'array',
            description: 'External integrations as a todo-list: one entry per automation/service the project talks to.',
            items: {
              type: 'object', required: ['name'],
              properties: {
                name: { type: 'string', description: 'Service name (e.g. "YouTube API", "exa.ai").' },
                purpose: { type: 'string', description: 'What the project uses it for.' },
                env_keys: { type: 'array', items: { type: 'string' }, description: 'API-key env names if known (any casing — normalized to UPPER_SNAKE).' },
              },
            },
          },
          owner_does_not_know: { type: 'boolean', description: 'true = the owner cannot answer; the model decides at planning time (defer_to_planning).' },
        },
      },
    },
    {
      name: 'owner_projects_orchestrate_decomposition',
      description:
        'The FROZEN PROJECT PROCESS (step 184) — deep, materialize-first decomposition of a private ' +
        'project/automation into a validated queue of development sub-steps. Call it AFTER ' +
        'owner_projects_route_request fixed the route as private-project (and normally after the ' +
        'cron/integrations survey). You PROPOSE a graph of nodes ({ id?, title, kind, description, task, ' +
        'tools[], envKeys[], io{in,out}, todo[], dependsOn[] }) plus the project block ' +
        '({ purpose, efficiency, reuse, result }); the engine NORMALIZES it, VALIDATES the DAG, GATES on ' +
        'SPEC COMPLETENESS (needs_spec lists exactly what to fill — nothing is materialized while ' +
        'incomplete), and on a real run MATERIALIZES everything to disk BEFORE any development: the ' +
        'project-root README.md (why / how it works / efficiency / reuse / result + the fractera:project ' +
        'machine block, at the frozen project-page mount) + one rich spec step per node + one ' +
        'coder-handoff step per coder-built node in DEVELOPMENT-STEPS/NEW-STEPS/. It does NOT deploy and ' +
        'does NOT write code — a coding agent builds each node later from its step (you hand it ONLY the ' +
        'step number, and you WATCH for completion before opening dependent nodes).\n\n' +
        'Protocol (order sheet, mutating tool — never skip):\n' +
        '  1) call with dry_run:true — it returns order_sheet (one RESOLVED line per node + the readme ' +
        'plan + announce_text + confirm_instruction); show the owner every line VERBATIM;\n' +
        '  2) if the sheet carries mvp_recommendation (a graph over 10 nodes) — relay it VERBATIM first ' +
        '(soft gate: MVP of <=10 nodes, extensions as future tasks; the owner decides);\n' +
        '  3) on the owner\'s explicit yes — call again with approve = order_sheet.id (a changed or ' +
        'unconfirmed plan is refused) and relay announce_text verbatim;\n' +
        '  4) resume (even in a new session): the SAME plan + the SAME approve token — files already on ' +
        'disk are skipped, only missing sub-steps are (re)written. Scope: ONLY projects/automations — ' +
        'site content pages go through owner_content_orchestrate (:3227), never here.',
      inputSchema: {
        type: 'object',
        required: ['plan'],
        properties: {
          plan: {
            type: 'object',
            description: 'The proposed graph: { category?, slug?, project{purpose,efficiency,reuse,result}, nodes[] } (a bare nodes array is also accepted by the engine, but pass the full object so the readme plan is complete).',
          },
          category: { type: 'string', description: 'Project category (e.g. automation | personal); overrides plan.category.' },
          slug: { type: 'string', description: 'Project slug (kebab-case, English — rule 166); overrides plan.slug.' },
          owner_lang: { type: 'string', enum: ['en', 'ru'], description: 'Language of the verbatim owner-facing texts (announce / confirm / MVP). Default en.' },
          dry_run: { type: 'boolean', description: 'true = plan only, NOTHING written; returns the order sheet to confirm. Always call this first.' },
          approve: { type: 'string', description: 'The order_sheet.id from THAT dry-run — required for a real (materializing) run.' },
        },
      },
    },
  ]
}

export class ProjectsRouterMcpServer {
  constructor({ port, secret, appDir }) {
    this.port = port
    this.secret = secret
    this.appDir = appDir ?? '/opt/fractera/app'
    // The slot's self-sufficient engine (a lone agent runs the same file directly — the MCP adds nothing).
    this.engine = join(this.appDir, '.agents/skills/orchestrate-project-by-steps/orchestrate-project-by-steps.mjs')
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
      if (req.method === 'GET' && req.url === '/health') { res.end(JSON.stringify({ ok: true, server: 'projects-router' })); return }
      if (req.method !== 'POST') { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return }
      let body = ''
      req.on('data', c => { body += c })
      req.on('end', () => { try { this._handle(JSON.parse(body), res) } catch { res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' })) } })
    })
    server.listen(this.port, '127.0.0.1', () => console.log(`[mcp:projects-router] http://127.0.0.1:${this.port}`))
  }

  _handle(rpc, res) {
    const { id, method, params } = rpc
    const ok = r => res.end(JSON.stringify({ jsonrpc: '2.0', id, result: r }))
    const fail = (c, m) => res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: c, message: m } }))
    if (handleMcpHandshake(rpc, res, 'fractera-projects-router-bridge')) return
    if (method === 'tools/list') return ok({ tools: toolsSchema() })
    if (method === 'tools/call') {
      try {
        const name = params?.name, args = params?.arguments ?? {}
        if (name === 'owner_projects_route_request') return ok(this._route(args))
        if (name === 'owner_projects_survey_automation_needs') return ok(this._survey(args))
        if (name === 'owner_projects_orchestrate_decomposition')
          return this._decompose(args).then(ok, e => fail(-32603, String(e?.message ?? e)))
        return fail(-32603, `Unknown tool: ${name}`)
      } catch (e) { return fail(-32603, String(e?.message ?? e)) }
    }
    fail(-32601, `Method not found: ${method}`)
  }

  _route(args) {
    const request = String(args.request ?? '').trim()
    if (!request) throw new Error('request is required')
    const category = args.category_hint && ['automation', 'fractera-pages', 'personal', 'other'].includes(args.category_hint)
      ? args.category_hint
      : classifyCategory(request)

    // The fixed verdict — only for a call carrying the owner's explicit confirmed answer.
    if (args.confirmed_choice === 'public-pages' || args.confirmed_choice === 'private-project') {
      if (args.confirmed_choice === 'public-pages')
        return textResult({ ok: true, route: 'pages', route_fixed: true,
          next: 'Continue into the task-scenario-router (CRUD-DOCS/workspace-standards/task-scenario-router.md): step 0 app-making, then FROZEN-ASSEMBLY (owner_content_orchestrate :3227, flat plan) vs REAL-DEVELOPMENT (delegate to a coding agent). This router\'s job is done.' })
      return textResult({ ok: true, route: 'projects', route_fixed: true, category,
        path: `/projects/${category}/<project-slug>`,
        next: '1) run owner_projects_survey_automation_needs (cron + integrations); 2) declare the project (P3 declaration carries cron/integrations) or compose it directly via owner_template_compose_project_page (:3224, frozen project-page: react-flow diagram + cron/results tables); 3) real features → hand off to a coding agent; env keys materialize via the persist-env-var-with-rebuild channel (step 143). Access: architect+manager only, single default language, named folders only.' })
    }

    // No confirmed answer yet: score the signals and either propose or ask.
    const proj = score(request, PROJECT_SIGNALS, { maskPublic: true })
    const pages = score(request, PAGES_SIGNALS)
    const confident = (proj.n >= 2 && pages.n === 0) || (pages.n >= 2 && proj.n === 0)
    if (!confident)
      return textResult({ needs_input: true,
        question: VERBATIM_QUESTION_RU, question_en: VERBATIM_QUESTION_EN,
        how_to_ask: 'Ask the owner this question VERBATIM (translate only if the dialogue language differs, preserving the meaning exactly) and wait for an explicit answer. Then re-call with confirmed_choice.',
        signals: { projects: proj.hits, pages: pages.hits } })

    const proposed = proj.n > pages.n ? 'projects' : 'pages'
    return textResult({ proposed_route: proposed,
      ...(proposed === 'projects' ? { category } : {}),
      confidence: 'high', signals: { projects: proj.hits, pages: pages.hits },
      confirmation_required: true,
      confirm_prompt: proposed === 'projects'
        ? `Правильно ли я вас понимаю: это сервис для вашего собственного использования (приватный проект, категория «${category}»), не публичная страница для внешних пользователей? Подтвердите — и я зафиксирую маршрут.`
        : 'Правильно ли я вас понимаю: это публичный сервис/страницы для внешних пользователей сайта, не приватная автоматизация для вас лично? Подтвердите — и я зафиксирую маршрут.',
      next: 'After the owner\'s explicit confirmation re-call with confirmed_choice. The route is NOT fixed until then.' })
  }

  _survey(args) {
    const hasAnswers = args.cron != null || Array.isArray(args.cron_intents) || Array.isArray(args.integrations) || args.owner_does_not_know
    if (!hasAnswers)
      return textResult({ phase: 'questions',
        questions: [
          { key: 'cron', ru: 'Проект будет поддерживать cron-процессы (задачи по расписанию)?', en: 'Will the project run cron processes (scheduled jobs)?' },
          { key: 'integrations', ru: 'Какие внешние интеграции нужны проекту (сервисы/API)?', en: 'Which external integrations (services/APIs) does the project need?' },
        ],
        how_to_ask: 'Ask both questions in the dialogue language. Present integrations as a todo-list: one entry per automation/service, each with the API env keys it needs. "I don\'t know" is a valid answer — re-call with owner_does_not_know:true.',
        next: 'Re-call with the answers: { cron, cron_intents, integrations } or { owner_does_not_know:true }.' })

    if (args.owner_does_not_know)
      return textResult({ ok: true, defer_to_planning: true,
        advice: 'The owner cannot answer — at the planning stage the model is AUTHORIZED to decide itself: pick the cron intents and integrations the project needs and create the records (declaration fields + env keys via the persist-env-var-with-rebuild channel, step 143).' })

    const cronEnabled = args.cron === 'yes'
    const intents = (Array.isArray(args.cron_intents) ? args.cron_intents : [])
      .map(it => ({ title: String(it?.title ?? '').trim(), schedule: it?.schedule ? String(it.schedule).trim() : null }))
      .filter(it => it.title)
    const integrations = (Array.isArray(args.integrations) ? args.integrations : [])
      .map(it => {
        const name = String(it?.name ?? '').trim()
        const given = Array.isArray(it?.env_keys) ? it.env_keys.map(toEnvKey).filter(Boolean) : []
        return { name, purpose: it?.purpose ? String(it.purpose).trim() : null,
          envKeys: given.length ? given : (name ? [`${toEnvKey(name).replace(/_API(_KEY)?$/, '')}_API_KEY`] : []) }
      })
      .filter(it => it.name)

    return textResult({ ok: true,
      cron: { enabled: cronEnabled || intents.length > 0, intents },
      integrations, defer_to_planning: false,
      apply: {
        declaration: 'Record cron + integrations in the P3 declaration (declare panel / README machine-block) — the declaration is the durable store, this tool wrote nothing.',
        cron_runtime: 'At compose/development time the intents become the project\'s cron.json (substrate runner fractera-cron re-reads it every tick, step 179).',
        env: 'Materialize each envKey via the persist-env-var-with-rebuild channel (step 143: setter → app/.env.local → rebuild). Never hardcode keys.',
        compose: 'Then compose the project page via owner_template_compose_project_page (:3224) and hand real features to a coding agent.',
      } })
  }

  // MCP face of the frozen project process (step 184 D5): spawn the slot engine, relay its gates
  // with the exact next action. The engine is the single implementation — this adds no logic.
  async _decompose(args) {
    const plan = args.plan
    if (plan == null || (typeof plan !== 'object')) throw new Error('plan is required (the proposed node graph object)')
    const cli = [this.engine, '--out', this.appDir, '--plan', JSON.stringify(plan)]
    if (args.category) cli.push('--category', String(args.category))
    if (args.slug) cli.push('--slug', String(args.slug))
    if (['en', 'ru'].includes(args.owner_lang)) cli.push('--owner-lang', args.owner_lang)
    if (typeof args.approve === 'string' && args.approve) cli.push('--approve', args.approve)
    if (args.dry_run) cli.push('--dry-run')

    const { code, out } = await this._spawn(process.execPath, cli)
    const last = (() => { try { return JSON.parse(out.trim().split('\n').filter(Boolean).pop()) } catch { return null } })()
    if (!last) throw new Error(`engine produced no JSON (exit ${code}): ${out.slice(-400)}`)

    // Spec gate — the graph is incomplete; nothing was materialized.
    if (last.ok === false && last.needs_spec)
      return textResult({ ...last, advice: 'The graph is incomplete — fill every `missing` item (task / description / >=1 todo / io / well-formed envKeys per node; purpose/efficiency/reuse/result in the project block) and call dry_run again. Do NOT invent placeholder specs to pass the gate.' })
    // DAG gate — structural.
    if (last.ok === false && last.gate === 'dag')
      return textResult({ ...last, advice: 'The graph topology is invalid — fix dependsOn / cycles and call dry_run again.' })
    // Approve gate — the mutating run was not confirmed.
    if (last.ok === false && last.gate === 'approve')
      return textResult({ ...last, advice: 'Run dry_run first, show the returned order_sheet lines to the owner VERBATIM (mvp_recommendation first if present), get an explicit yes, then call again passing that dry_run\'s order_sheet.id as approve. Never invent or reuse a token.' })

    if (args.dry_run)
      return textResult({ ...last, advice: 'Show the owner every order_sheet line VERBATIM (one per node + the readme plan). If mvp_recommendation is present, relay it VERBATIM FIRST (the owner decides). On an explicit yes — call again with approve = order_sheet.id and relay announce_text verbatim. On edits — change the plan and dry_run again (the id changes).' })
    if (code !== 0 || last.ok === false) throw new Error(`engine exited ${code}: ${out.slice(-400)}`)
    return textResult({ ...last, advice: 'The queue is materialized (project README + spec steps + coder-handoff steps). Development is DELEGATED: hand a coding agent ONLY the handoff-step number, then WATCH for completion (step in COMPLETED-STEPS/ + a deployment record) before opening dependent nodes (order = the DAG). To resume after a death: the SAME plan + the SAME approve token.' })
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
