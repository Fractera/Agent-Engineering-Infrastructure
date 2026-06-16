import { createServer } from 'http'
import { handleMcpHandshake } from './mcp-handshake.js'

// ── Public Consultant MCP server (L2, port 3219) ────────────────────────────
// The FIRST public-tier MCP. Unlike the owner bridges (which Hermes uses to run
// the workspace), this server hosts tools safe for an ANONYMOUS site visitor —
// the ones the future `public-consultant` chat (left-slot drawer, ai-elements)
// will call on a visitor's behalf. Access tier: `public` (MCP-REGISTRY §8.3) —
// read-only, no private data, no shared config, no other users' data.
//
// Tier/first-party are declared here for the future access manifest:
export const SERVER_TIER = 'public'
export const SERVER_FIRST_PARTY = true
//
// Data lives in app.db (the footer tables defined in the app SCHEMA); like the
// deployments bridge we read it through the data service (:3300) generic
// /db/migrate SELECT — the bridge process has no direct DB access. The footer is
// rendered on the public site, so listing its pages is public by nature.
//
// NOTE (theme/width): per-visitor theme and center-width are NOT here — they are
// browser state, applied by CLIENT-side tools inside the chat, never a server MCP.
//
// This is an L2 Hermes-side MCP — separate from the L1 claude.ai deploy MCP.

function textResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] }
}

function toolsSchema() {
  return [
    {
      name: 'public_footer_list_pages',
      description:
        'PUBLIC, read-only. List the footer navigation pages/links of this site for a given ' +
        'language: each page\'s label, path, route_id, and whether it has drawer content. Safe for ' +
        'anonymous visitors — the footer is shown on the public site, no private data is returned. ' +
        'Use this to answer a visitor asking what pages/sections the site has. No confirmation needed.',
      inputSchema: {
        type: 'object',
        properties: {
          lang: { type: 'string', description: 'Language code for labels, e.g. "en" (default "en"; falls back to any available label).' },
        },
      },
    },
  ]
}

export class PublicConsultantMcpServer {
  constructor({ port, secret, dataUrl, dataSecret }) {
    this.port = port
    this.secret = secret
    this.dataUrl = (dataUrl ?? 'http://localhost:3300').replace(/\/$/, '')
    this.dataSecret = dataSecret ?? ''
  }

  async _dataMigrate(sql, params = []) {
    const headers = { 'Content-Type': 'application/json', 'X-Agent-Identity': 'public-consultant' }
    if (this.dataSecret) headers['X-Data-Secret'] = this.dataSecret
    const res = await fetch(`${this.dataUrl}/db/migrate`, {
      method: 'POST', headers, body: JSON.stringify({ sql, params }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) throw new Error(`data service ${res.status}`)
    return res.json()
  }

  async _listFooterPages(lang) {
    const wantLang = (lang || 'en').trim() || 'en'
    let categories = [], translations = [], contentRouteIds = new Set()
    try {
      const cats = await this._dataMigrate(
        "SELECT id, route_id, path, order_index FROM menu_categories WHERE slot_name = 'footer' ORDER BY order_index"
      )
      categories = cats.rows ?? []
      if (!categories.length) return { lang: wantLang, pages: [] }

      const trans = await this._dataMigrate('SELECT category_id, lang, label FROM menu_category_translations')
      translations = trans.rows ?? []

      const content = await this._dataMigrate('SELECT DISTINCT route_id FROM footer_page_contents')
      contentRouteIds = new Set((content.rows ?? []).map((r) => r.route_id))
    } catch {
      // Tables may not exist yet on a brand-new DB → no footer pages.
      return { lang: wantLang, pages: [] }
    }

    const pages = categories.map((cat) => {
      const t =
        translations.find((x) => x.category_id === cat.id && x.lang === wantLang) ??
        translations.find((x) => x.category_id === cat.id)
      return {
        label: t?.label ?? '',
        path: cat.path ?? '',
        route_id: cat.route_id ?? '',
        has_content: contentRouteIds.has(cat.route_id),
      }
    })
    return { lang: wantLang, pages }
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
        res.end(JSON.stringify({ ok: true, server: 'public-consultant' })); return
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
      console.log(`[mcp:public-consultant] http://127.0.0.1:${this.port}`)
    )
  }

  _handle(rpc, res) {
    const { id, method, params } = rpc
    const ok   = r => res.end(JSON.stringify({ jsonrpc: '2.0', id, result: r }))
    const fail = (c, m) => res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: c, message: m } }))

    if (handleMcpHandshake(rpc, res, 'fractera-public-consultant-bridge')) return
    if (method === 'tools/list') return ok({ tools: toolsSchema() })
    if (method === 'tools/call') {
      if (params?.name !== 'public_footer_list_pages') return fail(-32601, `Unknown tool: ${params?.name}`)
      return this._listFooterPages(params?.arguments?.lang).then(r => ok(textResult(r))).catch(e => fail(-32603, e.message))
    }
    fail(-32601, `Method not found: ${method}`)
  }
}
