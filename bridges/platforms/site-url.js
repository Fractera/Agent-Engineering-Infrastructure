import { readFileSync } from 'fs'

// Server-side public site URL — the mode-aware address a VISITOR uses, derived the
// SAME way the client runtime-urls.ts derives it, but from the slot's app/.env.local
// (no window here). Used so an MCP tool reports the CORRECT public link instead of an
// internal/plain-HTTP host (the secure-mode bug: Hermes checked http://fractera-app:3000
// — wrong host AND unprotected — when the site is served at https://<domain>).
//
// Secure mode (FRACTERA_IP_NODOMAIN_MODE=false): the apex domain is recovered from
//   AUTH_SERVICE_URL (https://auth.<apex> → https://<apex>); the public site is the apex.
// IP/demo mode (true): the slot is served on http://<host>:3000.
// Falls back to http://localhost:3000 if nothing is determinable.

const KNOWN_PREFIXES = ['www', 'auth', 'admin', 'data', 'hermes', 'lightrag', 'chat']

function readEnv(file) {
  const env = {}
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line)
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch { /* no file */ }
  return env
}

// Returns the public site base URL (no trailing slash), e.g. https://aifa.dev or http://1.2.3.4:3000
export function publicSiteUrl(appEnvFile = '/opt/fractera/app/.env.local') {
  const env = readEnv(appEnvFile)
  const secure = String(env.FRACTERA_IP_NODOMAIN_MODE).toLowerCase() === 'false'
  const auth = env.AUTH_SERVICE_URL || ''
  let host = '', protocol = secure ? 'https:' : 'http:'
  try { const u = new URL(auth); host = u.hostname; if (u.protocol) protocol = u.protocol } catch { /* */ }

  if (secure && host) {
    const labels = host.split('.')
    const apex = KNOWN_PREFIXES.includes(labels[0]) ? labels.slice(1).join('.') : host
    return `${protocol}//${apex}`.replace(/\/+$/, '')
  }
  // IP / demo mode: slot is on :3000 of the same host (strip any port from auth host)
  const ipHost = host || 'localhost'
  return `http://${ipHost}:3000`
}

// Build the per-language view URLs for a composed tab, mode-aware.
// langs default localizes; e.g. publicTabUrls('news', ['en','es']) ->
//   ['https://aifa.dev/en/news', 'https://aifa.dev/es/news']
export function publicTabUrls(tab, langs = ['en'], appEnvFile) {
  const base = publicSiteUrl(appEnvFile)
  return (langs.length ? langs : ['en']).map(l => `${base}/${l}/${tab}`)
}
