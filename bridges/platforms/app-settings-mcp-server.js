import { createServer } from 'http'
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'fs'
import { dirname } from 'path'
import { handleMcpHandshake } from './mcp-handshake.js'
import { APP_SETTINGS_CATALOG, APP_SETTINGS_IMAGE_FIELDS, IMAGE_UPLOAD_NOTE } from './app-settings-catalog.js'

// Default slot env path (the Shell's .env.local) — same file the /api/config/languages
// route upserts. Languages are BUILD-TIME (NEXT_PUBLIC_SUPPORTED_LANGUAGES feeds
// generateStaticParams), so setting them needs a rebuild to take effect.
const DEFAULT_ENV_PATH = process.env.APP_ENV_PATH ?? '/opt/fractera/app/.env.local'
const SUPPORTED_KEY = 'NEXT_PUBLIC_SUPPORTED_LANGUAGES'
const DEFAULT_LOCALE_KEY = 'NEXT_PUBLIC_DEFAULT_LOCALE'
const LOCKED_LANG = 'en' // always kept — the guaranteed fallback locale

// Read a single KEY=value from a .env content (ignores comments/blanks).
function readEnvValue(content, key) {
  for (const line of content.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq < 0) continue
    if (t.slice(0, eq).trim() === key) return t.slice(eq + 1).trim()
  }
  return null
}
// Replace the line for `key` if present, else append — preserves all other lines/comments.
function upsertEnvLine(content, key, value) {
  const lines = content.length ? content.split('\n') : []
  let found = false
  const next = lines.map((line) => {
    const t = line.trim()
    if (!t || t.startsWith('#')) return line
    const eq = t.indexOf('=')
    if (eq < 0) return line
    if (t.slice(0, eq).trim() === key) { found = true; return `${key}=${value}` }
    return line
  })
  if (!found) next.push(`${key}=${value}`)
  while (next.length && next[next.length - 1] === '') next.pop()
  return next.join('\n') + '\n'
}

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
        'config and triggers on-demand revalidation of the public pages, so the change shows on the ' +
        "app's NEXT page load while the pages stay static (ISR).",
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Dot-path of the setting, e.g. "description" or "seo.titleTemplate".' },
          value: { description: 'The new value (string for text; number/boolean for number/flag fields).' },
        },
        required: ['path', 'value'],
      },
    },
    {
      name: 'owner_app_settings_list_languages',
      description:
        'Read the app language SET: the configured languages (codes) and the default language. ' +
        'Languages are BUILD-TIME (they feed static page generation), stored in the Shell env, not the ' +
        'runtime config file. Read-only.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'owner_app_settings_set_languages',
      description:
        'Set the app language SET (e.g. the owner says "add French"). Writes the languages + default ' +
        'locale to the Shell env. IMPORTANT: languages are BUILD-TIME — this does NOT apply instantly; ' +
        'the app must be REBUILT for the new languages to appear (tell the owner it takes a few minutes ' +
        "to rebuild). 'en' is always kept as the guaranteed fallback. Use ISO codes (e.g. en, es, fr, de).",
      inputSchema: {
        type: 'object',
        properties: {
          languages: { type: 'array', items: { type: 'string' }, description: 'Language codes to support, e.g. ["en","es","fr"]. "en" is forced in if missing.' },
          defaultLanguage: { type: 'string', description: 'Optional default locale; must be one of languages. Defaults to "en".' },
        },
        required: ['languages'],
      },
    },
  ]
}

const BY_PATH = new Map(APP_SETTINGS_CATALOG.map((e) => [e.path, e]))
const IMAGE_PATHS = new Set(APP_SETTINGS_IMAGE_FIELDS.map((f) => f.path))

export class AppSettingsMcpServer {
  constructor({ port, secret, configPath, envPath }) {
    this.port = port
    this.secret = secret
    this.configPath = configPath
    this.envPath = envPath ?? DEFAULT_ENV_PATH
  }

  _load() { try { return JSON.parse(readFileSync(this.configPath, 'utf8')) } catch { return {} } }
  // Atomic write: serialise to a temp file then rename over the target, so a crash
  // mid-write never leaves a half-written (corrupt) config the Shell would fail to parse.
  _save(raw) {
    mkdirSync(dirname(this.configPath), { recursive: true })
    const tmp = `${this.configPath}.tmp`
    writeFileSync(tmp, JSON.stringify(raw, null, 2), 'utf8')
    renameSync(tmp, this.configPath)
  }

  // Best-effort: tell the Shell (:3000, a different process) to purge its ISR cache so
  // a text change shows on the next page load instead of waiting out revalidate=600.
  // Fire-and-forget — revalidation must NEVER fail or delay the write. The Shell pages
  // stay static; this only purges their cache. x-agent-identity passes the proxy.ts API
  // gate; REVALIDATE_SECRET (when set) authenticates. Languages are NOT revalidated here
  // (they are build-time and need a rebuild). → step 134 part C.
  _revalidate() {
    const url = process.env.SHELL_REVALIDATE_URL ?? 'http://127.0.0.1:3000/api/revalidate'
    const headers = { 'Content-Type': 'application/json', 'x-agent-identity': 'app-settings-mcp' }
    const sec = process.env.REVALIDATE_SECRET
    if (sec) headers.Authorization = `Bearer ${sec}`
    try { fetch(url, { method: 'POST', headers, body: '{}' }).catch(() => {}) } catch { /* ignore */ }
  }

  // Languages are BUILD-TIME → a change applies only after the app is REBUILT. Fire the existing
  // deploy pipeline (POST :3002/api/deploy → `npm run build --prefix app` + `pm2 reload fractera-app`),
  // so the voice/MCP path self-heals the switcher instead of leaving a stale (or single-language) set.
  // A single POST is enough: the deploy route COALESCES — a request during an in-flight build is
  // recorded and rebuilt for the latest state on finish, so the final language set always bakes.
  // Best-effort: if DEPLOY_SECRET is absent the trigger is skipped and the tool returns the honest
  // "rebuild required" note. → step 138.
  _triggerRebuild() {
    const sec = process.env.DEPLOY_SECRET
    if (!sec) return false
    const url = process.env.DEPLOY_TRIGGER_URL ?? 'http://127.0.0.1:3002/api/deploy'
    const headers = { 'Content-Type': 'application/json', 'x-deploy-secret': sec }
    fetch(url, { method: 'POST', headers, body: JSON.stringify({ description: 'Language set changed → rebuild' }) }).catch(() => {})
    return true
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
      this._revalidate() // purge the Shell's ISR cache → change shows on next load
      return textResult({ ok: true, path, value: v, is_set: isSet(e, v) })
    }

    if (name === 'owner_app_settings_list_languages') {
      const content = existsSync(this.envPath) ? readFileSync(this.envPath, 'utf8') : ''
      const raw = readEnvValue(content, SUPPORTED_KEY) ?? LOCKED_LANG
      const languages = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
      const defaultLanguage = (readEnvValue(content, DEFAULT_LOCALE_KEY) ?? LOCKED_LANG).trim().toLowerCase()
      return textResult({
        languages: languages.length ? languages : [LOCKED_LANG],
        defaultLanguage,
        note: 'Languages are build-time. Changing them needs a rebuild to take effect.',
      })
    }

    if (name === 'owner_app_settings_set_languages') {
      const input = Array.isArray(args.languages) ? args.languages : []
      // Normalise: lowercase ISO-ish codes, dedupe, always include the locked fallback.
      const codes = [...new Set(
        input.map((c) => String(c).trim().toLowerCase()).filter((c) => /^[a-z]{2,3}$/.test(c))
      )]
      if (!codes.includes(LOCKED_LANG)) codes.unshift(LOCKED_LANG)
      if (codes.length === 0) throw new Error('No valid language codes given (use ISO codes like en, es, fr).')
      let def = String(args.defaultLanguage ?? LOCKED_LANG).trim().toLowerCase()
      if (!codes.includes(def)) def = LOCKED_LANG

      const content = existsSync(this.envPath) ? readFileSync(this.envPath, 'utf8') : ''
      let next = upsertEnvLine(content, SUPPORTED_KEY, codes.join(','))
      next = upsertEnvLine(next, DEFAULT_LOCALE_KEY, def)
      const tmp = `${this.envPath}.tmp`
      mkdirSync(dirname(this.envPath), { recursive: true })
      writeFileSync(tmp, next, 'utf8')
      renameSync(tmp, this.envPath)

      const rebuildTriggered = this._triggerRebuild()
      return textResult({
        ok: true,
        languages: codes,
        defaultLanguage: def,
        rebuild_required: true,
        rebuild_triggered: rebuildTriggered,
        note: rebuildTriggered
          ? 'Saved to the Shell env. Languages are BUILD-TIME — a rebuild has been STARTED (a few minutes); the new language set and the switcher button apply once it finishes.'
          : 'Saved to the Shell env. Languages are BUILD-TIME — they appear only after the app is REBUILT (a few minutes). Trigger a rebuild from Admin → deploy, or tell the owner it will apply after the next rebuild.',
      })
    }

    throw new Error(`Unknown tool: ${name}`)
  }
}
