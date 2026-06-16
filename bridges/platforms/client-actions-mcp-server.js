import { createServer } from 'http'
import { handleMcpHandshake } from './mcp-handshake.js'

// ── Client Actions MCP server (L2, port 3220) ───────────────────────────────
// Tools the public-consultant agent can PROPOSE but that execute in the VISITOR'S
// BROWSER, not on the server (MCP-REGISTRY §8.3, manifest `execution:"client"`).
// A server MCP cannot touch a live browser tab; these per-visitor view actions
// (navigate / locale / theme / width) are run client-side by the chat widget. So
// each tool here does NOT do work — its result is a deferred envelope
//   { "__client_action__": true, "tool": <name>, "args": {…} }
// which /api/consultant detects in the Hermes stream and forwards to the browser
// as a clickable action. The browser's allowlist registry validates args (locale
// ∈ configured, route ∈ allowed) and executes the matching handler. The click is
// the §8.2 confirmation. Access tier: `public` — acts only on the caller's own view.
//
// This is an L2 Hermes-side MCP — separate from the L1 claude.ai deploy MCP.

export const SERVER_TIER = 'public'
export const SERVER_FIRST_PARTY = true

// Single source of the v1 client-action tool names (mirror of the manifest entries
// with execution:"client"). The real allowlist + arg validation lives in the browser.
const CLIENT_ACTIONS = new Set([
  'public_view_navigate_page',
  'public_view_set_locale',
  'public_view_set_theme',
  'public_view_set_width',
])

function textResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] }
}

function toolsSchema() {
  return [
    {
      name: 'public_view_navigate_page',
      description:
        'PUBLIC, browser-executed. Propose navigating the visitor\'s own view to a page of this site. ' +
        'Rendered as a button the visitor clicks (the click is the confirmation). Propose only paths that ' +
        'exist on the site. Does not change anything for other visitors or any shared state.',
      inputSchema: {
        type: 'object',
        properties: { to: { type: 'string', description: 'Target path on this site, e.g. "/pricing".' } },
        required: ['to'],
      },
    },
    {
      name: 'public_view_set_locale',
      description:
        'PUBLIC, browser-executed. Propose switching the visitor\'s own view to one of the languages the ' +
        'site is configured for. Rendered as a button; the click confirms. Propose ONLY configured locales ' +
        '(ask/list them first). Affects only this visitor, never the global default.',
      inputSchema: {
        type: 'object',
        properties: { locale: { type: 'string', description: 'Configured language code, e.g. "fr".' } },
        required: ['locale'],
      },
    },
    {
      name: 'public_view_set_theme',
      description:
        'PUBLIC, browser-executed. Propose setting the visitor\'s own colour theme. Rendered as a button; ' +
        'the click confirms. Affects only this visitor\'s session, never the global default.',
      inputSchema: {
        type: 'object',
        properties: { mode: { type: 'string', enum: ['light', 'dark', 'system'], description: 'Theme mode.' } },
        required: ['mode'],
      },
    },
    {
      name: 'public_view_set_width',
      description:
        'PUBLIC, browser-executed. Propose setting the visitor\'s own center content width. Rendered as a ' +
        'button; the click confirms. Affects only this visitor\'s session, never the global default.',
      inputSchema: {
        type: 'object',
        properties: { width: { type: 'string', enum: ['narrow', 'wide'], description: 'Center width.' } },
        required: ['width'],
      },
    },
  ]
}

export class ClientActionsMcpServer {
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
        res.end(JSON.stringify({ ok: true, server: 'client-actions' })); return
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
      console.log(`[mcp:client-actions] http://127.0.0.1:${this.port}`)
    )
  }

  _handle(rpc, res) {
    const { id, method, params } = rpc
    const ok   = r => res.end(JSON.stringify({ jsonrpc: '2.0', id, result: r }))
    const fail = (c, m) => res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: c, message: m } }))

    if (handleMcpHandshake(rpc, res, 'fractera-client-actions-bridge')) return
    if (method === 'tools/list') return ok({ tools: toolsSchema() })
    if (method === 'tools/call') {
      const name = params?.name
      if (!CLIENT_ACTIONS.has(name)) return fail(-32601, `Unknown tool: ${name}`)
      // Deferred execution: the work happens in the browser. Return the envelope
      // /api/consultant forwards to the widget as a clickable action.
      return ok(textResult({ __client_action__: true, tool: name, args: params?.arguments ?? {} }))
    }
    fail(-32601, `Method not found: ${method}`)
  }
}
