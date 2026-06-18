import { createServer } from 'http'
import { handleMcpHandshake } from './mcp-handshake.js'

// ── AI Draft MCP server (L2, port 3221) ─────────────────────────────────────
// Any of the 6 coding agents (claude-code, codex, gemini-cli, qwen-code,
// kimi-code, hermes) can call owner_draft_create_record to propose a new
// skill or MCP connector. The server generates a structured source skeleton
// and todo tasks from the description, then publishes the draft to
// AI-DRAFT-SETTINGS/ via the app's own API (:3000). The architect sees the
// draft on /ai-draft-settings, reviews it and finalises it.
//
// §8.2 confirm flow via dry_run:
//   call with dry_run=true → preview returned, nothing written to disk.
//   call without dry_run    → draft created; link returned.
//
// This is an L2 Hermes-side MCP — separate from the L1 claude.ai deploy MCP.

function textResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] }
}

function toolsSchema() {
  return [
    {
      name: 'owner_draft_create_record',
      description:
        'Create a structured draft record in AI-DRAFT-SETTINGS/ for any coding agent ' +
        '(claude-code, codex, gemini-cli, qwen-code, kimi-code, hermes). ' +
        'A draft is a proposal for a new skill (.md file the agent reads) or MCP connector. ' +
        'It generates a source skeleton and actionable tasks from your description, then ' +
        'publishes the draft to the /ai-draft-settings page for the architect to review.\n\n' +
        'CONFIRM FIRST (§8.2): call with dry_run=true to get a preview, show the architect, ' +
        'get explicit confirmation, THEN call without dry_run to create.',
      inputSchema: {
        type: 'object',
        required: ['agent', 'kind', 'name', 'description'],
        properties: {
          agent: {
            type: 'string',
            enum: ['hermes', 'claude-code', 'codex', 'gemini-cli', 'qwen-code', 'kimi-code'],
            description: 'Which agent this draft is for.',
          },
          kind: {
            type: 'string',
            enum: ['skill', 'mcp'],
            description: '"skill" — a markdown instruction file the agent reads; "mcp" — an MCP connector tool.',
          },
          name: {
            type: 'string',
            description: 'Short title for the draft (≤50 chars).',
          },
          description: {
            type: 'string',
            description: 'What the skill/connector should do. Used to generate source skeleton and tasks.',
          },
          tier: {
            type: 'string',
            enum: ['public', 'user', 'owner'],
            description: 'MCP access tier (§8.3). Only meaningful for kind=mcp. Default: "owner".',
          },
          mutating: {
            type: 'boolean',
            description: 'Whether the MCP tool writes state (true) or is read-only (false). Only for kind=mcp. Default: true.',
          },
          mode: {
            type: 'string',
            enum: ['supplement', 'replace'],
            description: 'How to apply the draft to the original file. Default: "supplement".',
          },
          dry_run: {
            type: 'boolean',
            description: 'true → return preview without creating anything (§8.2 confirm step). false/omit → create.',
          },
        },
      },
    },
  ]
}

// §8.1 tool name slug (mirrors draft-format.ts toolNamePreview)
function toolNamePreview(tier, name) {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return `${tier}_${slug || 'area_action_object'}`
}

// ── Source generators ────────────────────────────────────────────────────────

function buildSkillSource(name, description) {
  const useWhen = extractUseWhen(description)
  const steps = extractSteps(description)
  return [
    `# ${name}`,
    '',
    description,
    '',
    '## When to use',
    '',
    `Use this skill when: ${useWhen}`,
    '',
    '## Steps',
    '',
    steps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
    '',
    '## Expected output',
    '',
    extractExpectedOutput(description),
    '',
  ].join('\n')
}

function buildMcpSource(name, description, tier, mutating) {
  const toolName = toolNamePreview(tier, name)
  const channel = tier === 'owner' ? 'owner-hermes' : 'public-consultant'
  return [
    `# ${name}`,
    '',
    description,
    '',
    '## Tool name preview',
    '',
    `\`${toolName}\` — subject to finalization per §8.1`,
    '',
    `## Tier: ${tier} | Mutating: ${mutating} | Channel: ${channel}`,
    '',
    '## What it does',
    '',
    description,
    '',
    '## Parameters',
    '',
    extractParams(description),
    '',
    '## Returns',
    '',
    '_(describe the response shape here)_',
    '',
  ].join('\n')
}

// ── Task generator ───────────────────────────────────────────────────────────

function buildTasks(description, kind) {
  const lower = description.toLowerCase()
  const tasks = []
  let id = 1

  if (/creat|writ|sav|stor|post|insert|add/.test(lower)) {
    tasks.push({ id: String(id++), body: 'Implement the write path with proper error handling', kind: 'todo' })
  }
  if (/read|list|get|fetch|load|query|scan/.test(lower)) {
    tasks.push({ id: String(id++), body: 'Implement the read path and format the output', kind: 'todo' })
  }
  if (/delet|remov|wipe|clean/.test(lower)) {
    tasks.push({ id: String(id++), body: 'Implement the delete/cleanup path safely', kind: 'todo' })
  }
  if (kind === 'mcp' && !/confirm|dry.?run/.test(lower)) {
    tasks.push({ id: String(id++), body: 'Add §8.2 confirm-before-mutate flow if the tool mutates state', kind: 'todo' })
  }

  while (tasks.length < 2) {
    const fallbacks = [
      'Flesh out the implementation with real logic',
      'Add input validation and edge-case handling',
      'Test with real data on the running server',
    ]
    tasks.push({ id: String(id++), body: fallbacks[tasks.length], kind: 'todo' })
  }

  return tasks
}

// ── NLP helpers (simple keyword extraction) ─────────────────────────────────

function extractUseWhen(desc) {
  const lower = desc.toLowerCase()
  if (/when|if|after|before/.test(lower)) {
    const m = lower.match(/(when|if|after|before)[^.]+/)
    if (m) return m[0].slice(0, 80)
  }
  return desc.slice(0, 80) + (desc.length > 80 ? '…' : '')
}

function extractSteps(desc) {
  const sentences = desc.split(/[.;]/).map(s => s.trim()).filter(Boolean)
  if (sentences.length >= 3) return sentences.slice(0, 3).map(s => s.charAt(0).toUpperCase() + s.slice(1))
  if (sentences.length === 2) {
    return [
      sentences[0].charAt(0).toUpperCase() + sentences[0].slice(1),
      sentences[1].charAt(0).toUpperCase() + sentences[1].slice(1),
      'Verify the output and handle errors',
    ]
  }
  return [
    'Understand the input parameters',
    desc.slice(0, 60) + (desc.length > 60 ? '…' : ''),
    'Return a structured result',
  ]
}

function extractExpectedOutput(desc) {
  if (/return|output|result|respond/.test(desc.toLowerCase())) {
    const m = desc.match(/(return|output|result|respond)[^.]+/i)
    if (m) return m[0].slice(0, 100)
  }
  return '_(describe the expected output here)_'
}

function extractParams(desc) {
  const lower = desc.toLowerCase()
  const params = []
  if (/\bid\b/.test(lower)) params.push('- `id` (string) — identifier')
  if (/name/.test(lower)) params.push('- `name` (string) — label or title')
  if (/path|file/.test(lower)) params.push('- `path` (string) — file path')
  if (/content|text|body/.test(lower)) params.push('- `content` (string) — text content')
  if (params.length === 0) params.push('_(add parameters here)_')
  return params.join('\n')
}

// ── Main server class ────────────────────────────────────────────────────────

export class AiDraftMcpServer {
  constructor({ port, secret, appUrl }) {
    this.port = port
    this.secret = secret
    this.appUrl = appUrl ?? 'http://127.0.0.1:3000'
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
        res.end(JSON.stringify({ ok: true, server: 'ai-draft' })); return
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
      console.log(`[mcp:ai-draft] http://127.0.0.1:${this.port}`)
    )
  }

  _handle(rpc, res) {
    const { id, method, params } = rpc
    const ok   = r => res.end(JSON.stringify({ jsonrpc: '2.0', id, result: r }))
    const fail = (c, m) => res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: c, message: m } }))

    if (handleMcpHandshake(rpc, res, 'fractera-ai-draft-bridge')) return
    if (method === 'tools/list') return ok({ tools: toolsSchema() })
    if (method === 'tools/call') {
      return this._call(params?.name, params?.arguments ?? {})
        .then(ok)
        .catch(e => fail(-32603, e.message))
    }
    fail(-32601, `Method not found: ${method}`)
  }

  async _call(name, args) {
    if (name !== 'owner_draft_create_record') throw new Error(`Unknown tool: ${name}`)
    return this._createRecord(args)
  }

  async _createRecord(args) {
    const {
      agent,
      kind,
      name,
      description,
      tier = 'owner',
      mutating = true,
      mode = 'supplement',
      dry_run = false,
    } = args

    if (!agent) throw new Error('agent is required')
    if (!kind || !['skill', 'mcp'].includes(kind)) throw new Error('kind must be "skill" or "mcp"')
    if (!name) throw new Error('name is required')
    if (!description) throw new Error('description is required')

    const source = kind === 'skill'
      ? buildSkillSource(name, description)
      : buildMcpSource(name, description, tier, mutating)

    const tasks = buildTasks(description, kind)

    if (dry_run) {
      return textResult({
        preview: true,
        agent, kind, name, tier: kind === 'mcp' ? tier : undefined,
        mutating: kind === 'mcp' ? mutating : undefined,
        generatedSource: source,
        generatedTasks: tasks.map(t => t.body),
        confirm_prompt:
          `Создам ${kind === 'skill' ? 'навык' : 'MCP черновик'} «${name}» для ${agent}. ` +
          `Source и tasks выше. Повторите вызов без dry_run для подтверждения.`,
      })
    }

    // Create the draft record via the app API
    const createRes = await fetch(`${this.appUrl}/api/ai-draft-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Agent-Identity': 'hermes' },
      body: JSON.stringify({ agent, kind, name, mode, tier, mutating }),
      signal: AbortSignal.timeout(10000),
    })

    if (!createRes.ok) {
      const txt = await createRes.text().catch(() => '')
      throw new Error(`Draft create failed (${createRes.status}): ${txt.slice(0, 200)}`)
    }

    const { draft } = await createRes.json()
    const draftId = draft?.id
    if (!draftId) throw new Error('Draft created but no id returned')

    // Patch with generated source and tasks
    const patchRes = await fetch(`${this.appUrl}/api/ai-draft-settings/${draftId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Agent-Identity': 'hermes' },
      body: JSON.stringify({ source, tasks }),
      signal: AbortSignal.timeout(10000),
    })

    if (!patchRes.ok) {
      const txt = await patchRes.text().catch(() => '')
      throw new Error(`Draft patch failed (${patchRes.status}): ${txt.slice(0, 200)}`)
    }

    const agentLabel = agent.replace(/-/g, ' ')
    return textResult({
      created: true,
      draftId,
      rel: draft.rel,
      name,
      agent,
      kind,
      link: `Go to /ai-draft-settings → ${agentLabel.charAt(0).toUpperCase() + agentLabel.slice(1)} → ${kind === 'skill' ? 'Skills' : 'MCP'}`,
    })
  }
}
