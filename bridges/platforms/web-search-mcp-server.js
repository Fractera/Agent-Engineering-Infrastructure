import { createServer } from 'http'
import { readFileSync } from 'fs'
import { handleMcpHandshake } from './mcp-handshake.js'

// ── Web Search MCP server (L2, port 3231) ───────────────────────────────────
// A HERMES-NATIVE ONE-OFF ability (step 190, phase E2.1). The request router
// (route-project-or-pages-request) sends one-off/direct wishes here — "search the
// web for X", "look this up" — that must NOT become a built durable automation.
// Hermes (or any agent) performs the search ITSELF with this tool and answers; it
// builds nothing, materializes no nodes for repetition.
//
// Backed by exa.ai (already named as a first-class web-search building block in
// SOUL). The provider key is a normal integration env (EXA_API_KEY) via the
// persist-env-var-with-rebuild channel — NOT an AI-platform key (the "subscription
// only, no API" rule is about the 5 coding platforms, not about a search service).
//
// Token economy: the tool returns COMPACT results (title, url, date, a short
// snippet) — never whole pages. Snippet length and result count are capped so the
// payload entering the model context stays bounded regardless of the query.
//
// Read-only (a search mutates nothing) → no dry_run. Bearer gate (step 135).
// Zero new deps (native fetch). SINGLE-LINE JSON (step 158). L2 loopback only.

const textResult = data => ({ content: [{ type: 'text', text: JSON.stringify(data) }] })

const EXA_ENDPOINT = 'https://api.exa.ai/search'
const DEFAULT_NUM_RESULTS = 5
const MAX_NUM_RESULTS = 10
const DEFAULT_SNIPPET_CHARS = 500
const MAX_SNIPPET_CHARS = 1200
const FETCH_TIMEOUT_MS = 30_000

function clampInt(v, def, min, max) {
  const n = Math.floor(Number(v))
  if (!Number.isFinite(n)) return def
  return Math.max(min, Math.min(max, n))
}

function collapse(s) { return String(s ?? '').replace(/\s+/g, ' ').trim() }

// Compact one exa result to the minimum the model needs to answer or cite.
function compactResult(r, snippetChars) {
  const snippetSource = Array.isArray(r?.highlights) && r.highlights.length
    ? r.highlights.join(' … ')
    : (r?.text ?? r?.summary ?? '')
  const snippet = collapse(snippetSource).slice(0, snippetChars)
  return {
    title: collapse(r?.title) || '(untitled)',
    url: r?.url ?? null,
    published: r?.publishedDate ?? null,
    author: r?.author ? collapse(r.author) : undefined,
    snippet: snippet || undefined,
  }
}

function toolsSchema() {
  return [
    {
      name: 'owner_web_search',
      description:
        'Search the live web and get back a compact, cited list of results (title, url, date, a short ' +
        'snippet). This is a ONE-OFF/DIRECT ability (step 190): use it when the owner asks you to look ' +
        'something up, find current information, or gather sources — a one-time action you perform ' +
        'YOURSELF. Do NOT turn a "search the web" wish into a built durable automation; just search and ' +
        'answer. For a deeper multi-source write-up that is also saved to memory, that is the research ' +
        'ability (a separate skill) — this tool is the raw search underneath it.\n\n' +
        'TOKEN ECONOMY: results are compact — a bounded number of items, each with a short snippet, never ' +
        'whole pages. Raise num_results / snippet_chars only when you genuinely need more.\n\n' +
        'Backed by exa.ai; needs the EXA_API_KEY integration env (set via persist-env-var-with-rebuild / ' +
        'the missing-keys modal). If the key is absent the tool returns needs_key with a clear message — ' +
        'that is NOT a platform fault, just an un-provisioned integration. Read-only: it changes nothing.',
      inputSchema: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', description: 'What to search for, in natural language.' },
          num_results: { type: 'number', description: `How many results to return (default ${DEFAULT_NUM_RESULTS}, max ${MAX_NUM_RESULTS}).` },
          snippet_chars: { type: 'number', description: `Max characters of the snippet per result (default ${DEFAULT_SNIPPET_CHARS}, max ${MAX_SNIPPET_CHARS}).` },
          include_domains: { type: 'array', items: { type: 'string' }, description: 'Optional: restrict results to these domains (e.g. ["arxiv.org"]).' },
          category: { type: 'string', description: 'Optional exa category hint (e.g. "news", "research paper", "company").' },
        },
      },
    },
  ]
}

export class WebSearchMcpServer {
  constructor({ port, secret, exaKey, appEnvPath }) {
    this.port = port
    this.secret = secret
    this.exaKey = exaKey ?? ''
    // The bridge dotenv-loads app/.env.local at startup, but the owner usually adds
    // EXA_API_KEY LATER via the missing-keys modal (which restarts fractera-app, not
    // fractera-bridge). So resolve the key lazily from that file at call time too —
    // the search works the moment the key is saved, no bridge restart needed.
    this.appEnvPath = appEnvPath ?? '/opt/fractera/app/.env.local'
  }

  // Startup env value first; else read the current EXA_API_KEY from app/.env.local.
  _resolveKey() {
    if (this.exaKey) return this.exaKey
    try {
      const line = readFileSync(this.appEnvPath, 'utf-8').split(/\r?\n/).find(l => /^\s*EXA_API_KEY\s*=/.test(l))
      if (line) return line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
    } catch { /* file absent → treat as no key */ }
    return ''
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
      if (req.method === 'GET' && req.url === '/health') { res.end(JSON.stringify({ ok: true, server: 'web-search', key_present: Boolean(this._resolveKey()) })); return }
      if (req.method !== 'POST') { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return }
      let body = ''
      req.on('data', c => { body += c })
      req.on('end', () => { try { this._handle(JSON.parse(body), res) } catch { res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' })) } })
    })
    server.listen(this.port, '127.0.0.1', () => console.log(`[mcp:web-search] http://127.0.0.1:${this.port}`))
  }

  _handle(rpc, res) {
    const { id, method, params } = rpc
    const ok = r => res.end(JSON.stringify({ jsonrpc: '2.0', id, result: r }))
    const fail = (c, m) => res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: c, message: m } }))
    if (handleMcpHandshake(rpc, res, 'fractera-web-search-bridge')) return
    if (method === 'tools/list') return ok({ tools: toolsSchema() })
    if (method === 'tools/call') {
      const name = params?.name, args = params?.arguments ?? {}
      if (name === 'owner_web_search') {
        this._search(args).then(r => ok(textResult(r))).catch(e => fail(-32603, String(e?.message ?? e)))
        return
      }
      return fail(-32603, `Unknown tool: ${name}`)
    }
    fail(-32601, `Method not found: ${method}`)
  }

  async _search(args) {
    const query = collapse(args.query)
    if (!query) throw new Error('query is required')
    const exaKey = this._resolveKey()
    // No key → calm, structured status (like choose-agent when no agent is signed in).
    if (!exaKey)
      return {
        needs_key: true, key: 'EXA_API_KEY',
        message: 'Web search needs the EXA_API_KEY integration (exa.ai). It is not set yet — this is not a fault, just an un-provisioned integration. Add the key via the missing-keys modal / persist-env-var-with-rebuild, then search again.',
      }

    const numResults = clampInt(args.num_results, DEFAULT_NUM_RESULTS, 1, MAX_NUM_RESULTS)
    const snippetChars = clampInt(args.snippet_chars, DEFAULT_SNIPPET_CHARS, 80, MAX_SNIPPET_CHARS)
    const payload = {
      query, numResults, type: 'auto',
      contents: { text: { maxCharacters: Math.max(snippetChars, 200) }, highlights: { numSentences: 2, highlightsPerUrl: 2, query } },
    }
    if (Array.isArray(args.include_domains) && args.include_domains.length)
      payload.includeDomains = args.include_domains.map(d => collapse(d)).filter(Boolean)
    if (args.category) payload.category = collapse(args.category)

    let resp
    try {
      resp = await fetch(EXA_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': exaKey, Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
    } catch (e) { throw new Error(`web search request failed: ${String(e?.cause?.message ?? e?.message ?? e)}`) }
    if (resp.status === 401 || resp.status === 403)
      return { needs_key: true, key: 'EXA_API_KEY', message: `exa.ai rejected the key (HTTP ${resp.status}). Check EXA_API_KEY is valid; update it via persist-env-var-with-rebuild and search again.` }
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '')
      throw new Error(`exa.ai returned HTTP ${resp.status}${detail ? ` — ${collapse(detail).slice(0, 200)}` : ''}`)
    }

    const data = await resp.json().catch(() => null)
    const rawResults = Array.isArray(data?.results) ? data.results : []
    const results = rawResults.slice(0, numResults).map(r => compactResult(r, snippetChars))
    return {
      ok: true, query, count: results.length, results,
      for_the_owner: results.length
        ? 'Summarize these results for the owner in their language and cite the urls. This was a one-off search — nothing was built or scheduled.'
        : 'No results found. Tell the owner plainly; offer to refine the query. Nothing was built.',
    }
  }
}
