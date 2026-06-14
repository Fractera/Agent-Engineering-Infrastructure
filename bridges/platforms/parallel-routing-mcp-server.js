import { createServer } from 'http'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { handleMcpHandshake } from './mcp-handshake.js'

// ── Parallel Routing MCP server (L2, port 3217) ─────────────────────────────
// Lets Hermes READ and CONTROL the Shell's parallel-routing layout:
//   - get_parallel_routing_project_state  — is the project in parallel-routing
//     mode + which named slots/routes are active.
//   - activate_or_deactivate_layout_route — toggle one slot active flag.
// Storage is the Shell's on-disk runtime config
// (app/PLATFORM-CONFIG/platform-config.json: the `parallelRouting` flag + `slots`
// map) — the SAME file the visual selector (Admin -> Platform -> "Parallel routes
// · setup") writes via /api/config/platform. One write-path, one contract, NO
// external DB. → ARCHITECTURE-PARALLEL-ROUTING.md (§9 in MCP-REGISTRY.md).
//
// This is an L2 Hermes-side MCP — separate from the L1 claude.ai deploy MCP.

const SLOTS = ['header', 'promoScreen', 'left', 'right', 'centerHeader', 'center', 'centerFooter', 'footer']
const LOCKED = ['header', 'footer']

function textResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] }
}

function toolsSchema() {
  return [
    {
      name: 'get_parallel_routing_project_state',
      description:
        "Read the project's parallel-routing state in ONE call: `parallelRouting` (boolean — whether " +
        'this project is set up for route/layout management; false = standard single-page mode with no ' +
        'parallel routes) and `slots` (map of the named layout slots to an active boolean: header, ' +
        'promoScreen, left, right, centerHeader, center, centerFooter, footer). Read-only, no tokens. ' +
        'Call this before toggling routes to see the current layout.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'activate_or_deactivate_layout_route',
      description:
        'Activate or deactivate ONE existing layout route-slot (the same flags the visual Platform ' +
        'selector edits). `header` and `footer` are locked (always active) and cannot be toggled. ' +
        "Deactivating `center` also deactivates centerHeader/centerFooter; centerHeader/centerFooter " +
        'cannot be activated while `center` is off. Persists to the Shell config and applies on the ' +
        "app's next load. Not destructive — toggles a flag, never deletes a route.",
      inputSchema: {
        type: 'object',
        properties: {
          slot: { type: 'string', enum: SLOTS, description: 'The layout slot to toggle.' },
          active: { type: 'boolean', description: 'true = activate, false = deactivate.' },
        },
        required: ['slot', 'active'],
      },
    },
  ]
}

// Missing key = active by default (matches the Shell defaults and the selector).
function normalizeSlots(raw) {
  const s = (raw && raw.slots) || {}
  const out = {}
  for (const k of SLOTS) out[k] = s[k] !== false
  return out
}

export class ParallelRoutingMcpServer {
  constructor({ port, secret, configPath }) {
    this.port = port
    this.secret = secret
    this.configPath = configPath
  }

  _load() {
    try { return JSON.parse(readFileSync(this.configPath, 'utf8')) } catch { return {} }
  }

  _save(raw) {
    mkdirSync(dirname(this.configPath), { recursive: true })
    writeFileSync(this.configPath, JSON.stringify(raw, null, 2), 'utf8')
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
        res.end(JSON.stringify({ ok: true, server: 'parallel-routing' })); return
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
      console.log(`[mcp:parallel-routing] http://127.0.0.1:${this.port}`)
    )
  }

  _handle(rpc, res) {
    const { id, method, params } = rpc
    const ok   = r => res.end(JSON.stringify({ jsonrpc: '2.0', id, result: r }))
    const fail = (c, m) => res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: c, message: m } }))

    if (handleMcpHandshake(rpc, res, 'fractera-parallel-routing-bridge')) return
    if (method === 'tools/list') return ok({ tools: toolsSchema() })
    if (method === 'tools/call') {
      try { return ok(this._call(params?.name, params?.arguments ?? {})) }
      catch (e) { return fail(-32603, e.message) }
    }
    fail(-32601, `Method not found: ${method}`)
  }

  _call(name, args) {
    if (name === 'get_parallel_routing_project_state') {
      const raw = this._load()
      return textResult({ parallelRouting: raw.parallelRouting === true, slots: normalizeSlots(raw) })
    }

    if (name === 'activate_or_deactivate_layout_route') {
      const { slot, active } = args
      if (!SLOTS.includes(slot)) throw new Error(`Unknown slot: ${slot}. Valid: ${SLOTS.join(', ')}`)
      if (typeof active !== 'boolean') throw new Error("'active' must be a boolean")
      if (LOCKED.includes(slot)) throw new Error(`Slot '${slot}' is locked (always active) and cannot be toggled`)

      const raw = this._load()
      const slots = normalizeSlots(raw)
      if ((slot === 'centerHeader' || slot === 'centerFooter') && active && !slots.center) {
        throw new Error(`Enable 'center' before activating '${slot}'`)
      }
      slots[slot] = active
      if (slot === 'center' && !active) { slots.centerHeader = false; slots.centerFooter = false }

      raw.slots = slots
      this._save(raw)
      return textResult({ ok: true, slot, active, slots })
    }

    throw new Error(`Unknown tool: ${name}`)
  }
}
