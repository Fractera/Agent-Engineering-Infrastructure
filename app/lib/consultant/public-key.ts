import fs from 'fs'
import { spawnSync, spawn } from 'child_process'

// Key lifecycle for the PUBLIC consultant process (its OWN credential pool in
// HERMES_HOME=/root/.hermes-public — isolated from the owner's key, so anonymous traffic
// never drains the owner's quota). Mirrors bridges/app addOpenAiKeyToPool but targets the
// public home and restarts fractera-hermes-public. Self-contained (the Shell app/ has no
// env-file helper). → next-step "Интерактивный консультант" R7.
//
// SAFETY (set-if-empty): the public page lets an ANONYMOUS visitor set the key when none
// exists yet (the developer's "land → paste key → go" flow). But anonymous OVERWRITE of a
// working key is an abuse vector — so POST refuses when a key is already set; the OWNER
// replaces it from Admin. First key wins; replacement is privileged.

const PUBLIC_HOME = process.env.PUBLIC_HERMES_HOME ?? '/root/.hermes-public'
const PUBLIC_ENV = `${PUBLIC_HOME}/.env`
const POOL_LABEL = 'fractera-openai-public'

export function publicKeyConfigured(): boolean {
  try {
    const txt = fs.readFileSync(PUBLIC_ENV, 'utf-8')
    const m = txt.match(/^OPENAI_API_KEY=(.*)$/m)
    return !!(m && m[1].trim())
  } catch {
    return false
  }
}

function writeEnvKey(value: string): void {
  let txt = ''
  try { txt = fs.readFileSync(PUBLIC_ENV, 'utf-8') } catch { /* new file */ }
  if (/^OPENAI_API_KEY=.*$/m.test(txt)) {
    txt = txt.replace(/^OPENAI_API_KEY=.*$/m, `OPENAI_API_KEY=${value}`)
  } else {
    txt += `${txt && !txt.endsWith('\n') ? '\n' : ''}OPENAI_API_KEY=${value}\n`
  }
  fs.writeFileSync(PUBLIC_ENV, txt, 'utf-8')
}

// Register the key in the public process's credential pool (the reliable path — an
// env-seeded key can 401, step 89), de-duped by label. Best-effort.
function addToPublicPool(key: string): boolean {
  const env = { ...process.env, HOME: '/root', HERMES_HOME: PUBLIC_HOME, PATH: `/usr/local/bin:${process.env.PATH ?? ''}` }
  try { spawnSync('hermes', ['auth', 'remove', 'openai-api', POOL_LABEL], { env, timeout: 15000 }) } catch { /* may not exist */ }
  try {
    const r = spawnSync('hermes', ['auth', 'add', 'openai-api', '--type', 'api-key', '--label', POOL_LABEL, '--api-key', key], { env, timeout: 25000 })
    return r.status === 0
  } catch {
    return false
  }
}

function restartPublicProcess(): void {
  try {
    spawn('sh', ['-c', 'pm2 restart fractera-hermes-public --update-env'], { detached: true, stdio: 'ignore' }).unref()
  } catch { /* best-effort */ }
}

export type SetKeyResult = { ok: true } | { ok: false; status: number; error: string }

// Set the public consultant's OpenAI key. allowReplace=false (public page) refuses when a
// key already exists; the owner calls with allowReplace=true from Admin.
export function setPublicKey(key: string, allowReplace: boolean): SetKeyResult {
  const k = key.trim()
  if (!k.startsWith('sk-')) return { ok: false, status: 400, error: 'Invalid OpenAI key (expected sk-… format)' }
  if (!allowReplace && publicKeyConfigured()) {
    return { ok: false, status: 409, error: 'A key is already set for this site. The owner can replace it in Admin.' }
  }
  try {
    writeEnvKey(k)
  } catch (e) {
    return { ok: false, status: 500, error: `Write failed: ${e}` }
  }
  addToPublicPool(k)
  restartPublicProcess()
  return { ok: true }
}
