import { createServer } from 'http'
import { randomUUID } from 'crypto'

// ── Deployments MCP server (L2, port 3215) ──────────────────────────────────
// Singleton MCP server (not platform-bound) that lets Hermes drive the Product
// Loop: record/list/update one row per development deployment in the shared
// app.db `deployment_records` table (the admin "Deployments" table), and manage
// the `projects` list deployments are split by. Writes go through the data
// service (:3300) generic endpoints; reads use /db/migrate so rows come back
// newest-first (the generic GET has no ORDER BY). Deletion (records or
// projects) is intentionally NOT exposed here — human-only in the UI.
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
          step:           { type: 'string',  description: 'Step number this commit belongs to, e.g. "23" or "92-S3".' },
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
      description: 'List the most recent deployment records (newest first) to review past work. Each row includes its `id` — pass that id to update_deployment.',
      inputSchema: {
        type: 'object',
        properties: { limit: { type: 'number', description: 'Max rows (default 20, max 100).' } },
      },
    },
    {
      name: 'update_deployment',
      description:
        'Update an existing deployment record: change its star rating (result, 1-3), move it ' +
        'to a different project, and/or set the step number. Use the `id` from list_deployments. ' +
        'Everything else is written once at record time and is not editable here. Deleting a record ' +
        'is intentionally NOT available via MCP.',
      inputSchema: {
        type: 'object',
        properties: {
          id:      { type: 'string', description: 'Record id (from list_deployments).' },
          result:  { type: 'number', description: 'New star rating 1-3.' },
          project: { type: 'string', description: 'Move the record to this project name.' },
          step:    { type: 'string', description: 'Step number this commit belongs to, e.g. "23".' },
        },
        required: ['id'],
      },
    },
    {
      name: 'describe_record',
      description:
        'Return the full field catalog of a deployment record — every field, its type, whether you ' +
        'set it when recording or it is filled automatically, and what it means. Call this to know ' +
        'exactly what information a deployment row holds before recording or updating.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'create_project',
      description:
        'Add one new project to the project list so deployments can be split by codebase. Idempotent: ' +
        'if a project with this name already exists it is returned, not duplicated. Use the project ' +
        "name as the `project` argument of record_deployment / update_deployment. Deleting a project " +
        'is intentionally NOT available via MCP — that is human-only in the admin UI.',
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string', description: 'Project name (1-60 chars).' } },
        required: ['name'],
      },
    },
    {
      name: 'list_projects',
      description: 'List existing projects (default first, then newest) so you can reuse a name instead of creating a duplicate.',
      inputSchema: { type: 'object', properties: {} },
    },
  ]
}

// Full field catalog of one deployment record — surfaced to Hermes via
// describe_record so it always knows every field that exists, not only the
// inputs of record_deployment.
const RECORD_FIELDS = [
  { field: 'id',             type: 'string',  set_by: 'auto',        about: 'Unique record id (returned by record_deployment; use it in update_deployment).' },
  { field: 'result',         type: 'integer', set_by: 'hermes/user', about: 'Quality rating 1-3 (default 3). The user edits it in the UI; you may set/change it via update_deployment.' },
  { field: 'project',        type: 'string',  set_by: 'hermes',      about: "Project the record belongs to (default 'default'). Changeable via update_deployment." },
  { field: 'tokens',         type: 'integer', set_by: 'hermes',      about: 'Total tokens the agent spent (from delegate_to_platform). Default 0.' },
  { field: 'platform',       type: 'string',  set_by: 'hermes',      about: 'Coding agent that did the work (required at record time).' },
  { field: 'model',          type: 'string',  set_by: 'hermes',      about: 'Model used, e.g. gpt-5-mini.' },
  { field: 'page_url',       type: 'string',  set_by: 'hermes',      about: 'URL to review the change (required at record time).' },
  { field: 'commit_message', type: 'string',  set_by: 'hermes',      about: 'Short description of what changed.' },
  { field: 'status',         type: 'string',  set_by: 'hermes',      about: "ready | building | error (default 'ready')." },
  { field: 'duration_ms',    type: 'integer', set_by: 'hermes',      about: 'Build/work duration in milliseconds.' },
  { field: 'commit_hash',    type: 'string',  set_by: 'hermes',      about: 'Git commit hash, if any.' },
  { field: 'branch',         type: 'string',  set_by: 'hermes',      about: 'Git branch, if any.' },
  { field: 'step',           type: 'string',  set_by: 'hermes',      about: 'Step number this commit belongs to, e.g. "23". Changeable via update_deployment.' },
  { field: 'author',         type: 'string',  set_by: 'hermes',      about: "Display author (default 'Hermes')." },
  { field: 'created_at',     type: 'string',  set_by: 'auto',        about: 'UTC timestamp the record was created.' },
  { field: 'created_by',     type: 'string',  set_by: 'auto',        about: "Always 'hermes@agent' (records come from you)." },
]

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

// deployment_records.step was added after the table shipped (step 92 / S-A).
// The app SCHEMA carries it for fresh deploys, but the live data-service app.db
// on an already-running server needs the column via ALTER. Idempotent: tolerate
// "duplicate column" (already added) and "no such table" (a record insert below
// will surface the real error if the table is genuinely missing).
let stepColumnEnsured = false
async function ensureStepColumn() {
  if (stepColumnEnsured) return
  try {
    await dataMigrate('ALTER TABLE deployment_records ADD COLUMN step TEXT')
  } catch (e) {
    if (!/duplicate column|no such table/i.test(String(e?.message ?? e))) throw e
  }
  stepColumnEnsured = true
}

async function recordDeployment(args) {
  if (!args.platform) throw new Error('platform required')
  if (!args.page_url) throw new Error('page_url required')
  await ensureStepColumn()
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
    step:           args.step != null ? String(args.step) : null,
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

// Change an existing record's star rating and/or its project. Only these two
// fields are editable via MCP; deletion is deliberately not exposed (human-only
// in the UI). Other columns are write-once at record time.
async function updateDeployment(args) {
  if (!args.id) throw new Error('id required')
  await ensureStepColumn()
  const sets = [], params = []
  if (args.result !== undefined && args.result !== null) { sets.push('result = ?'); params.push(clampResult(args.result)) }
  if (args.project !== undefined && args.project !== null) { sets.push('project = ?'); params.push(String(args.project)) }
  if (args.step !== undefined && args.step !== null) { sets.push('step = ?'); params.push(String(args.step)) }
  if (sets.length === 0) throw new Error('nothing to update: provide result, project and/or step')
  params.push(args.id)
  const data = await dataMigrate(`UPDATE ${TABLE} SET ${sets.join(', ')} WHERE id = ?`, params)
  if (!data.changes) throw new Error(`no record with id ${args.id}`)
  return { ok: true, id: args.id, changes: data.changes }
}

function describeRecord() {
  return { table: TABLE, fields: RECORD_FIELDS }
}

// Ensure the projects table exists (the app layer also defines it in SCHEMA;
// this makes the MCP path self-sufficient even before that runs). DDL is
// allowed on /db/migrate.
async function ensureProjectsTable() {
  await dataMigrate(
    `CREATE TABLE IF NOT EXISTS projects (
       id TEXT PRIMARY KEY NOT NULL,
       name TEXT NOT NULL UNIQUE,
       created_at TEXT NOT NULL DEFAULT (datetime('now'))
     )`,
  )
}

// Add a project. Idempotent: INSERT OR IGNORE on the UNIQUE name, then return
// the row (existing or new). No delete — that is human-only in the UI.
async function createProject(args) {
  const name = String(args.name ?? '').trim()
  if (!name) throw new Error('name required')
  if (name.length > 60) throw new Error('name too long (max 60)')
  await ensureProjectsTable()
  const before = await dataMigrate('SELECT id FROM projects WHERE name = ?', [name])
  const existed = (before.rows ?? []).length > 0
  if (!existed) {
    await dataMigrate('INSERT OR IGNORE INTO projects (id, name) VALUES (?, ?)', [randomUUID(), name])
  }
  const row = await dataMigrate('SELECT id, name, created_at FROM projects WHERE name = ?', [name])
  return { ok: true, project: (row.rows ?? [])[0] ?? { name }, existed }
}

async function listProjects() {
  await ensureProjectsTable()
  const data = await dataMigrate(
    "SELECT id, name, created_at FROM projects ORDER BY (name = 'default') DESC, created_at DESC",
  )
  return { projects: data.rows ?? [] }
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
      case 'update_deployment': return textResult(await updateDeployment(args))
      case 'describe_record':   return textResult(describeRecord())
      case 'create_project':    return textResult(await createProject(args))
      case 'list_projects':     return textResult(await listProjects())
      default: throw new Error(`Unknown tool: ${name}`)
    }
  }
}
