import { createServer } from 'http'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { handleMcpHandshake } from './mcp-handshake.js'
import { APP_SETTINGS_CATALOG, APP_SETTINGS_IMAGE_FIELDS, IMAGE_UPLOAD_NOTE } from './app-settings-catalog.js'

// ── App Settings MCP server (L2, port 3218) ─────────────────────────────────
// Lets Hermes manage the deployed app's TEXT settings (App Settings — branding /
// SEO / PWA), the same on-disk config the Admin -> App Settings panel writes
// (app/APP-CONFIG/app-config.json). It enumerates every text record with its role,
// flags which the owner has not filled, and writes text values. IMAGES are not
// settable here — Hermes tells the owner to upload them via the control panel.
// → step 115. This is an L2 Hermes-side MCP, separate from the L1 deploy MCP.

function textResult(data) { return { content: [{ type: 'text', text: JSON.stringify(data) }] } }

function getAt(obj, path) {
  return path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj)
}
function setAt(obj, path, value) {
  const ks = path.split('.')
  let cur = obj
  for (let i = 0; i < ks.length - 1; i++) {
    const k = ks[i]
    if (!cur[k] || typeof cur[k] !== 'object' || Array.isArray(cur[k])) cur[k] = {}
    cur = cur[k]
  }
  cur[ks[ks.length - 1]] = value
  return obj
}

// A text/number field counts as "set by the owner" only when it is non-empty AND differs
// from the shipped default. choice/flag always have a usable value → considered set.
function isSet(entry, cur) {
  if (entry.kind === 'choice' || entry.kind === 'flag') return cur !== undefined && cur !== null
  if (entry.kind === 'number') return cur !== undefined && cur !== null && (entry.def === undefined || cur !== entry.def)
  if (typeof cur !== 'string' || cur.trim() === '') return false
  if (entry.def !== undefined && cur === entry.def) return false
  return true
}

function toolsSchema() {
  return [
    {
      name: 'owner_app_settings_list_text_fields',
      description:
        "Enumerate ALL of the app's text settings (App Settings — branding/SEO/PWA), grouped by " +
        'section. For each field: path, label, role (what it does and why it matters), kind, the ' +
        'current value, and is_set (whether the owner has filled it or it is still the default). ' +
        'Also returns image_fields + image_fields_note: images are NOT set here — the owner uploads ' +
        'them in the control panel. Read-only.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'owner_app_settings_list_unfilled_fields',
      description:
        'List only the TEXT settings the owner has NOT filled yet (still empty or the shipped ' +
        'default), each with its role and why it matters — so you can prompt the owner to complete ' +
        'them. Also returns image_fields_note (images go through the control panel). Read-only.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'owner_app_settings_set_text_value',
      description:
        'Set ONE app text setting by its path (e.g. name, description, url, seo.titleTemplate). ' +
        'Use owner_app_settings_list_text_fields to discover valid paths. choice fields must be one of ' +
        'their options; flag fields take true/false; number fields take a number. IMAGE fields are ' +
        'rejected — tell the owner to upload images via the control panel. Persists to the app ' +
        "config; applies on the app's next load.",
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Dot-path of the setting, e.g. "description" or "seo.titleTemplate".' },
          value: { description: 'The new value (string for text; number/boolean for number/flag fields).' },
        },
        required: ['path', 'value'],
      },
    },
  ]
}

const BY_PATH = new Map(APP_SETTINGS_CATALOG.map((e) => [e.path, e]))
const IMAGE_PATHS = new Set(APP_SETTINGS_IMAGE_FIELDS.map((f) => f.path))

export class AppSettingsMcpServer {
  constructor({ port, secret, configPath }) {
    this.port = port
    this.secret = secret
    this.configPath = configPath
  }

  _load() { try { return JSON.parse(readFileSync(this.configPath, 'utf8')) } catch { return {} } }
  _save(raw) { mkdirSync(dirname(this.configPath), { recursive: true }); writeFileSync(this.configPath, JSON.stringify(raw, null, 2), 'utf8') }

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
      if (req.method === 'GET' && req.url === '/health') { res.end(JSON.stringify({ ok: true, server: 'app-settings' })); return }
      if (req.method !== 'POST') { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return }
      let body = ''
      req.on('data', c => { body += c })
      req.on('end', () => { try { this._handle(JSON.parse(body), res) } catch { res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' })) } })
    })
    server.listen(this.port, '127.0.0.1', () => console.log(`[mcp:app-settings] http://127.0.0.1:${this.port}`))
  }

  _handle(rpc, res) {
    const { id, method, params } = rpc
    const ok = r => res.end(JSON.stringify({ jsonrpc: '2.0', id, result: r }))
    const fail = (c, m) => res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: c, message: m } }))
    if (handleMcpHandshake(rpc, res, 'fractera-app-settings-bridge')) return
    if (method === 'tools/list') return ok({ tools: toolsSchema() })
    if (method === 'tools/call') {
      try { return ok(this._call(params?.name, params?.arguments ?? {})) }
      catch (e) { return fail(-32603, e.message) }
    }
    fail(-32601, `Method not found: ${method}`)
  }

  _call(name, args) {
    const cfg = this._load()

    if (name === 'owner_app_settings_list_text_fields') {
      const sections = {}
      for (const e of APP_SETTINGS_CATALOG) {
        const cur = getAt(cfg, e.path)
        ;(sections[e.section] ??= []).push({
          path: e.path, label: e.label, kind: e.kind, role: e.role,
          ...(e.options ? { options: e.options } : {}),
          current: cur ?? null, is_set: isSet(e, cur),
        })
      }
      return textResult({
        sections: Object.entries(sections).map(([section, fields]) => ({ section, fields })),
        image_fields: APP_SETTINGS_IMAGE_FIELDS,
        image_fields_note: IMAGE_UPLOAD_NOTE,
      })
    }

    if (name === 'owner_app_settings_list_unfilled_fields') {
      const unfilled = APP_SETTINGS_CATALOG
        .filter((e) => e.kind === 'text' && !isSet(e, getAt(cfg, e.path)))
        .map((e) => ({ path: e.path, label: e.label, section: e.section, role: e.role }))
      return textResult({ count: unfilled.length, unfilled, image_fields_note: IMAGE_UPLOAD_NOTE })
    }

    if (name === 'owner_app_settings_set_text_value') {
      const { path, value } = args
      if (typeof path !== 'string' || !path) throw new Error("'path' is required")
      if (IMAGE_PATHS.has(path)) throw new Error(`'${path}' is an image. ${IMAGE_UPLOAD_NOTE}`)
      const e = BY_PATH.get(path)
      if (!e) throw new Error(`Unknown setting '${path}'. Call owner_app_settings_list_text_fields for valid paths.`)
      let v = value
      if (e.kind === 'number') { v = Number(value); if (Number.isNaN(v)) throw new Error(`'${path}' expects a number`) }
      else if (e.kind === 'flag') { v = value === true || value === 'true' }
      else if (e.kind === 'choice') { v = String(value); if (e.options && !e.options.includes(v)) throw new Error(`'${path}' must be one of: ${e.options.join(', ')}`) }
      else { v = String(value) }
      const raw = this._load()
      setAt(raw, path, v)
      this._save(raw)
      return textResult({ ok: true, path, value: v, is_set: isSet(e, v) })
    }

    throw new Error(`Unknown tool: ${name}`)
  }
}
