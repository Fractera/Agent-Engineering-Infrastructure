import { createServer } from 'http'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { handleMcpHandshake } from './mcp-handshake.js'

// ── Parallel Routing MCP server (L2, port 3217) ─────────────────────────────
// Lets Hermes READ and CONTROL the Shell's parallel-routing layout:
//   - owner_parallel_routing_get_state  — is the project in parallel-routing
//     mode + which named slots/routes are active.
//   - owner_parallel_routing_toggle_slot — toggle one slot active flag.
// Storage is the Shell's on-disk runtime config
// (app/PLATFORM-CONFIG/platform-config.json: the `parallelRouting` flag + `slots`
// map) — the SAME file the visual selector (Admin -> Platform -> "Parallel routes
// · setup") writes via /api/config/platform. One write-path, one contract, NO
// external DB. → ARCHITECTURE-PARALLEL-ROUTING.md (§9 in MCP-REGISTRY.md).
//
// This is an L2 Hermes-side MCP — separate from the L1 claude.ai deploy MCP.

const SLOTS = ['header', 'promoScreen', 'left', 'right', 'centerHeader', 'center', 'centerFooter', 'footer']
const LOCKED = ['header', 'footer']

// footer-slot toolbar defaults (theme + center width) the MCP can set in platform-config.
const THEME_MODES = ['system', 'light', 'dark']
const WIDTHS = ['narrow', 'wide']
const APPLY = ['next_load', 'now']

// Standard confirm-before-mutation note (MCP-REGISTRY §8.2) appended to every write tool.
const CONFIRM_NOTE =
  ' CONFIRM FIRST: before calling, restate to the user exactly what will change — ask ' +
  '"Правильно ли я вас понимаю, что вы хотите:" and list the concrete action (the value and ' +
  'the apply timing) — and call only after they explicitly confirm. Never guess.'

function textResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] }
}

function toolsSchema() {
  return [
    {
      name: 'owner_parallel_routing_get_state',
      description:
        "Read the project's parallel-routing state in ONE call: `parallelRouting` (boolean — whether " +
        'this project is set up for route/layout management; false = standard single-page mode with no ' +
        'parallel routes) and `slots` (map of the named layout slots to an active boolean: header, ' +
        'promoScreen, left, right, centerHeader, center, centerFooter, footer). Read-only, no tokens. ' +
        'Call this before toggling routes to see the current layout.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'owner_parallel_routing_toggle_slot',
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
    {
      name: 'footer_slot_owner_get_toolbar_state',
      description:
        "Read the footer slot toolbar's current DEFAULTS in one call: `theme` (default theme mode " +
        'the app starts from on load: system/light/dark), `allowUserToggle`, `centerWidth` (default ' +
        'center-column width: narrow/wide), and whether each toolbar button is shown (`themeButtonVisible`, ' +
        '`widthButtonVisible`). Read-only, no tokens. Call before changing a default to see the current value.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'footer_slot_owner_set_theme_mode',
      description:
        'Set the workspace DEFAULT theme mode for the footer theme toggle. Sets the server default new ' +
        'page loads start from — it does NOT override a user whose browser already has a saved theme ' +
        '(their own toggle wins; verify in a fresh/incognito session). `apply`: "next_load" applies on ' +
        'the next load; "now" also reloads open tabs immediately. Not destructive.' + CONFIRM_NOTE,
      inputSchema: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: THEME_MODES, description: 'system | light | dark.' },
          apply: { type: 'string', enum: APPLY, description: 'next_load (default) or now (reload open tabs).' },
        },
        required: ['mode'],
      },
    },
    {
      name: 'footer_slot_owner_set_center_width',
      description:
        'Set the workspace DEFAULT center-column width for the footer width toggle. Sets the server ' +
        'default new page loads start from. `apply`: "next_load" applies on the next load; "now" also ' +
        'reloads open tabs immediately. Not destructive.' + CONFIRM_NOTE,
      inputSchema: {
        type: 'object',
        properties: {
          width: { type: 'string', enum: WIDTHS, description: 'narrow | wide.' },
          apply: { type: 'string', enum: APPLY, description: 'next_load (default) or now (reload open tabs).' },
        },
        required: ['width'],
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

  // "apply now": bump reloadNonce so the Shell's ConfigReloadWatcher reloads open tabs.
  _bumpNonce(raw) {
    raw.reloadNonce = (typeof raw.reloadNonce === 'number' ? raw.reloadNonce : 0) + 1
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
    if (name === 'owner_parallel_routing_get_state') {
      const raw = this._load()
      return textResult({ parallelRouting: raw.parallelRouting === true, slots: normalizeSlots(raw) })
    }

    if (name === 'owner_parallel_routing_toggle_slot') {
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

    if (name === 'footer_slot_owner_get_toolbar_state') {
      const raw = this._load()
      const fp = (raw && raw.footerPlugins) || {}
      return textResult({
        theme: (raw.theme && raw.theme.default) || 'light',
        allowUserToggle: !(raw.theme && raw.theme.allowUserToggle === false),
        centerWidth: raw.centerWidth === 'wide' ? 'wide' : 'narrow',
        themeButtonVisible: fp.themeToggle !== false,
        widthButtonVisible: fp.widthToggle !== false,
      })
    }

    if (name === 'footer_slot_owner_set_theme_mode') {
      const { mode, apply = 'next_load' } = args
      if (!THEME_MODES.includes(mode)) throw new Error(`Unknown mode: ${mode}. Valid: ${THEME_MODES.join(', ')}`)
      if (!APPLY.includes(apply)) throw new Error(`Unknown apply: ${apply}. Valid: ${APPLY.join(', ')}`)
      const raw = this._load()
      raw.theme = { ...(raw.theme || {}), default: mode }
      if (apply === 'now') this._bumpNonce(raw)
      this._save(raw)
      return textResult({ ok: true, theme: mode, apply, reloadNonce: raw.reloadNonce })
    }

    if (name === 'footer_slot_owner_set_center_width') {
      const { width, apply = 'next_load' } = args
      if (!WIDTHS.includes(width)) throw new Error(`Unknown width: ${width}. Valid: ${WIDTHS.join(', ')}`)
      if (!APPLY.includes(apply)) throw new Error(`Unknown apply: ${apply}. Valid: ${APPLY.join(', ')}`)
      const raw = this._load()
      raw.centerWidth = width
      if (apply === 'now') this._bumpNonce(raw)
      this._save(raw)
      return textResult({ ok: true, centerWidth: width, apply, reloadNonce: raw.reloadNonce })
    }

    throw new Error(`Unknown tool: ${name}`)
  }
}
