import { createServer } from 'http'
import { mkdir, writeFile } from 'fs/promises'
import { resolve, sep, posix } from 'path'
import { handleMcpHandshake } from './mcp-handshake.js'

// ── Doc Transfer MCP server (L2, port 3230) ─────────────────────────────────
// The token-lean documentation courier of the Projects layer (step 181, P8 of the
// master plan 174). Coding agents usually have NO internet access — so when an
// automation needs external documentation (a platform API reference, a service
// guide), Hermes — WITH the owner's agreement — transfers a reasonable amount of it
// onto the workspace disk (CRUD-DOCS/external/) and submits it to Company Memory
// (LightRAG :9621), so the coder later finds it by a plain local read or a memory
// query, no internet required.
//
// Token economy is the point: the document body NEVER passes through the model's
// context. The bridge downloads, converts HTML to markdown, writes the file and
// submits the ingest itself; the model receives ONLY metadata — path, byte size,
// title, a table of contents. The transfer cost in tokens is a constant, not
// proportional to the document size.
//
// Mutating tool → §8.2: dry_run=true is the default and returns the plan for the
// owner's confirmation; only an explicit dry_run=false call touches the disk.
// SINGLE-LINE JSON (step 158) · Bearer gate (step 135) · L2 loopback only.

const textResult = data => ({ content: [{ type: 'text', text: JSON.stringify(data) }] })

const DEFAULT_MAX_BYTES = 2_000_000 // "reasonable amount" per document
const HARD_MAX_BYTES = 5_000_000 // absolute cap even when the owner raises the limit
const FETCH_TIMEOUT_MS = 30_000
const TOC_LIMIT = 40

// Minimal, dependency-free HTML → markdown for documentation pages. Not a full
// converter on purpose: the bridges stay zero-new-deps (dotenv/node-pty/ws only),
// and reference docs need headings, paragraphs, lists, links and code — not pixel
// fidelity. Unknown tags degrade to their text content.
export function htmlToMarkdown(html) {
  let s = String(html)
  // Drop the non-content subtrees entirely.
  s = s.replace(/<(script|style|noscript|svg|iframe|head)\b[\s\S]*?<\/\1>/gi, '')
  s = s.replace(/<!--[\s\S]*?-->/g, '')
  s = s.replace(/<(nav|footer|aside)\b[\s\S]*?<\/\1>/gi, '')
  // Code first, so its inner tags/entities survive untouched by later rules.
  s = s.replace(/<pre\b[^>]*>[\s\S]*?<code\b[^>]*>([\s\S]*?)<\/code>[\s\S]*?<\/pre>/gi,
    (_, code) => '\n```\n' + decodeEntities(stripTags(code)) + '\n```\n')
  s = s.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi,
    (_, code) => '\n```\n' + decodeEntities(stripTags(code)) + '\n```\n')
  s = s.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, c) => '`' + decodeEntities(stripTags(c)) + '`')
  // Structure.
  s = s.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi,
    (_, n, t) => '\n\n' + '#'.repeat(Number(n)) + ' ' + collapse(decodeEntities(stripTags(t))) + '\n\n')
  s = s.replace(/<a\b[^>]*href="([^"#][^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, t) => `[${collapse(decodeEntities(stripTags(t)))}](${href})`)
  s = s.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => '\n- ' + collapse(decodeEntities(stripTags(t))))
  s = s.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => '**' + collapse(decodeEntities(stripTags(t))) + '**')
  s = s.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => '*' + collapse(decodeEntities(stripTags(t))) + '*')
  s = s.replace(/<(p|div|section|article|tr|table|ul|ol|blockquote|br)\b[^>]*\/?>/gi, '\n')
  s = s.replace(/<\/(p|div|section|article|tr|table|ul|ol|blockquote)>/gi, '\n')
  s = s.replace(/<td\b[^>]*>([\s\S]*?)<\/td>/gi, (_, t) => ' ' + collapse(decodeEntities(stripTags(t))) + ' |')
  s = stripTags(s)
  s = decodeEntities(s)
  // Whitespace discipline: no 3+ blank lines, no trailing spaces.
  s = s.split('\n').map(l => l.replace(/[ \t]+$/g, '')).join('\n')
  s = s.replace(/\n{3,}/g, '\n\n').trim() + '\n'
  return s
}

function stripTags(s) { return String(s).replace(/<[^>]+>/g, '') }
function collapse(s) { return String(s).replace(/\s+/g, ' ').trim() }
function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
}

function extractHtmlTitle(html) {
  const m = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  return m ? collapse(decodeEntities(stripTags(m[1]))) : null
}

// The metadata the model gets INSTEAD of the content: markdown headings as a TOC.
function markdownToc(md) {
  const toc = []
  for (const line of md.split('\n')) {
    const m = /^(#{1,4})\s+(.+)$/.exec(line)
    if (m) toc.push({ level: m[1].length, title: m[2].trim() })
    if (toc.length >= TOC_LIMIT) break
  }
  return toc
}

function slugFromUrl(url) {
  try {
    const u = new URL(url)
    const tail = [u.hostname.replace(/^www\./, ''), ...u.pathname.split('/').filter(Boolean)]
      .join('-').toLowerCase().replace(/\.(html?|md|txt)$/i, '')
    const slug = tail.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
    return slug || 'external-doc'
  } catch { return 'external-doc' }
}

function toolsSchema() {
  return [
    {
      name: 'owner_docs_transfer_external_documentation',
      description:
        'Transfer EXTERNAL documentation (a URL) onto the workspace disk so coding agents — who ' +
        'usually have no internet access — can read it locally: download the page, convert HTML to ' +
        'clean markdown, save it under CRUD-DOCS/ in the app slot, and submit it to Company Memory ' +
        '(LightRAG) for indexing. Use it when preparing an automation/project specification that ' +
        'relies on an external service (a platform API reference, an SDK guide, a service doc): ' +
        'transfer the docs FIRST, then reference the saved local paths in the spec file for the coder.\n\n' +
        'TOKEN ECONOMY — the document body NEVER enters the model context: the bridge downloads, ' +
        'converts, writes and ingests by itself, and returns ONLY metadata (path, bytes, title, table ' +
        'of contents). Never fetch a doc into the chat to save it — that is exactly what this tool avoids.\n\n' +
        'Protocol (mutating → owner agreement first): 1) call with dry_run=true (default) — it returns ' +
        'the transfer plan without touching the network or disk; 2) confirm with the owner ' +
        '("Правильно ли я вас понимаю…" — name the URL and the target file); 3) re-call with ' +
        'dry_run=false to execute. Reasonable-volume guard: documents over max_bytes (default 2 MB) ' +
        'are refused, raise the limit only after agreeing it with the owner (hard cap 5 MB).',
      inputSchema: {
        type: 'object',
        required: ['url'],
        properties: {
          url: { type: 'string', description: 'The http(s) URL of the documentation page to transfer.' },
          target: { type: 'string', description: 'Relative path inside CRUD-DOCS for the saved markdown (default: external/<slug-from-url>.md). Forward slashes; ".md" is appended if missing.' },
          description: { type: 'string', description: 'One line about what this document is for (stored in the front-matter and as the Company Memory description).' },
          max_bytes: { type: 'number', description: `Reasonable-volume limit for the download (default ${DEFAULT_MAX_BYTES}; hard cap ${HARD_MAX_BYTES}). Raising it above the default is an owner-agreed decision.` },
          ingest: { type: 'boolean', description: 'Also submit the saved document to Company Memory (LightRAG) for indexing. Default true.' },
          dry_run: { type: 'boolean', description: 'true (DEFAULT) = return the transfer plan only, nothing is fetched or written. Execute only after the owner\'s explicit agreement, with dry_run=false.' },
        },
      },
    },
  ]
}

export class DocTransferMcpServer {
  constructor({ port, secret, appDir, ragUrl, ragKey }) {
    this.port = port
    this.secret = secret
    this.docsRoot = resolve(appDir ?? '/opt/fractera/app', 'CRUD-DOCS')
    this.ragUrl = (ragUrl ?? 'http://localhost:9621').replace(/\/+$/, '')
    this.ragKey = ragKey ?? ''
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
      if (req.method === 'GET' && req.url === '/health') { res.end(JSON.stringify({ ok: true, server: 'doc-transfer' })); return }
      if (req.method !== 'POST') { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return }
      let body = ''
      req.on('data', c => { body += c })
      req.on('end', () => { try { this._handle(JSON.parse(body), res) } catch { res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' })) } })
    })
    server.listen(this.port, '127.0.0.1', () => console.log(`[mcp:doc-transfer] http://127.0.0.1:${this.port}`))
  }

  _handle(rpc, res) {
    const { id, method, params } = rpc
    const ok = r => res.end(JSON.stringify({ jsonrpc: '2.0', id, result: r }))
    const fail = (c, m) => res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: c, message: m } }))
    if (handleMcpHandshake(rpc, res, 'fractera-doc-transfer-bridge')) return
    if (method === 'tools/list') return ok({ tools: toolsSchema() })
    if (method === 'tools/call') {
      const name = params?.name, args = params?.arguments ?? {}
      if (name === 'owner_docs_transfer_external_documentation') {
        this._transfer(args).then(r => ok(textResult(r))).catch(e => fail(-32603, String(e?.message ?? e)))
        return
      }
      return fail(-32603, `Unknown tool: ${name}`)
    }
    fail(-32601, `Method not found: ${method}`)
  }

  // Resolve the caller's target safely inside CRUD-DOCS (no traversal, .md enforced).
  _resolveTarget(url, target) {
    let rel = String(target ?? '').trim().replace(/\\/g, '/').replace(/^\/+/, '')
    if (!rel) rel = `external/${slugFromUrl(url)}.md`
    if (!/\.md$/i.test(rel)) rel += '.md'
    rel = posix.normalize(rel)
    const abs = resolve(this.docsRoot, rel)
    if (abs !== this.docsRoot && !abs.startsWith(this.docsRoot + sep)) throw new Error('target escapes the CRUD-DOCS root')
    return { rel, abs }
  }

  async _transfer(args) {
    const url = String(args.url ?? '').trim()
    if (!/^https?:\/\//i.test(url)) throw new Error('url must be an absolute http(s) URL')
    const maxBytes = Math.min(Number(args.max_bytes) > 0 ? Number(args.max_bytes) : DEFAULT_MAX_BYTES, HARD_MAX_BYTES)
    const doIngest = args.ingest !== false
    const { rel, abs } = this._resolveTarget(url, args.target)

    if (args.dry_run !== false) {
      return {
        dry_run: true, plan: { url, target: rel, max_bytes: maxBytes, ingest: doIngest },
        confirm_prompt: `Правильно ли я вас понимаю: перенести документацию с ${url} в файл CRUD-DOCS/${rel} (лимит ${Math.round(maxBytes / 1000)} КБ)${doIngest ? ' и отправить её в Память компании (LightRAG)' : ''}? Кодинг-агент затем найдёт её локально, без интернета. Подтвердите — и я выполню перенос.`,
        next: 'After the owner\'s explicit agreement re-call with dry_run:false. Nothing was fetched or written.',
      }
    }

    // Download with a byte cap — refuse oversize instead of silently truncating.
    let resp
    try {
      resp = await fetch(url, {
        redirect: 'follow', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { 'User-Agent': 'Fractera-DocTransfer/1.0 (+workspace knowledge courier)', Accept: 'text/html,text/markdown,text/plain;q=0.9,*/*;q=0.5' },
      })
    } catch (e) { throw new Error(`fetch failed: ${String(e?.cause?.message ?? e?.message ?? e)}`) }
    if (!resp.ok) throw new Error(`the source returned HTTP ${resp.status} — check the URL`)
    const declared = Number(resp.headers.get('content-length') ?? 0)
    if (declared > maxBytes) throw new Error(`document is ${declared} bytes — over the agreed limit of ${maxBytes}. Agree a higher max_bytes with the owner (hard cap ${HARD_MAX_BYTES}) or pick a narrower page.`)
    const buf = Buffer.from(await resp.arrayBuffer())
    if (buf.byteLength > maxBytes) throw new Error(`document is ${buf.byteLength} bytes — over the agreed limit of ${maxBytes}. Agree a higher max_bytes with the owner (hard cap ${HARD_MAX_BYTES}) or pick a narrower page.`)

    const contentType = (resp.headers.get('content-type') ?? '').toLowerCase()
    const raw = buf.toString('utf-8')
    const isHtml = contentType.includes('html') || /^\s*<(!doctype|html)\b/i.test(raw)
    if (!isHtml && !contentType.includes('text/') && !contentType.includes('markdown') && !contentType.includes('json') && contentType !== '')
      throw new Error(`unsupported content-type "${contentType}" — this courier transfers text documentation only`)

    const title = (isHtml ? extractHtmlTitle(raw) : null) ?? rel.split('/').pop().replace(/\.md$/i, '')
    const body = isHtml ? htmlToMarkdown(raw) : raw.trim() + '\n'
    const description = String(args.description ?? '').trim() || `external documentation: ${title}`
    const frontMatter = `---\nsource: ${url}\nfetched: ${new Date().toISOString()}\npurpose: ${description.replace(/\n/g, ' ')}\n---\n\n`
    const text = frontMatter + body

    await mkdir(resolve(abs, '..'), { recursive: true })
    await writeFile(abs, text, 'utf-8')

    // Best-effort ingest into Company Memory — a failed submit never loses the file.
    let ingest = { submitted: false, ok: false, message: 'skipped (ingest:false)' }
    if (doIngest) {
      ingest = { submitted: true, ok: false, message: '' }
      try {
        const r = await fetch(`${this.ragUrl}/documents/text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': this.ragKey, 'X-Agent-Identity': 'doc-transfer-bridge' },
          body: JSON.stringify({ text, description: `crud-docs | ${rel}` }),
          signal: AbortSignal.timeout(120_000),
        })
        ingest.ok = r.ok
        ingest.message = r.ok ? 'sent to Company Memory for indexing' : `LightRAG rejected the submit (HTTP ${r.status}) — the file is saved; re-activate it from the /documents page later`
      } catch { ingest.message = 'Company Memory (LightRAG) is not reachable — the file is saved; activate it from the /documents page later' }
    }

    // Metadata ONLY — the body stays on disk, never in the model context.
    return {
      ok: true, path: `CRUD-DOCS/${rel}`, abs_path: abs, bytes: Buffer.byteLength(text, 'utf-8'),
      title, toc: markdownToc(body), ingest,
      for_the_spec: `Reference this document in the coder's specification as a LOCAL file: ${`CRUD-DOCS/${rel}`} (source: ${url}). The coder reads it from disk or queries Company Memory — no internet needed.`,
    }
  }
}
