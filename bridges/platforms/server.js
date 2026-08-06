import { WebSocketServer } from 'ws'
import { spawn, execSync } from 'child_process'
import { readFileSync } from 'fs'
import pty from 'node-pty'
import { createInterface } from 'readline'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../app/.env.local') })



// Shared PTY registry — MCP servers write here to reach active terminals
const activePtys = new Map() // platform id => (text: string) => boolean

// MCP auth secret (optional — set MCP_SECRET in env)
const MCP_SECRET = process.env.MCP_SECRET ?? null

// ── MCP helpers ──────────────────────────────────────────────────────────────

function extractMcpText(event) {
  if (event.type === 'stream_event' && event.event?.delta?.type === 'text_delta') return event.event.delta.text
  if (event.type === 'content' && event.value) return event.value
  if (event.type === 'assistant' && Array.isArray(event.message?.content))
    return event.message.content.filter(b => b.type === 'text').map(b => b.text).join('')
  if (event.type === 'item.completed' && event.item?.text) return event.item.text
  return ''
}

function isMcpDone(event) {
  return event.type === 'result' || event.type === 'turn_complete' || event.type === 'turn.completed'
}

function isMcpError(event) {
  return (event.type === 'result' && event.is_error) || event.type === 'turn.failed'
}

// Sum token usage from a done/turn event. Key names differ per CLI (Claude:
// cache_read_input_tokens/cache_creation_input_tokens; Gemini/Codex:
// cached_input_tokens/cached_tokens) — read tolerantly, return 0 if absent.
function extractMcpTokens(event) {
  const u = event.usage ?? {}
  const input  = u.input_tokens ?? 0
  const output = u.output_tokens ?? 0
  const cacheR = u.cache_read_input_tokens ?? u.cached_input_tokens ?? u.cached_tokens ?? 0
  const cacheW = u.cache_creation_input_tokens ?? 0
  return input + output + cacheR + cacheW
}

function makeRunPrompt(bin, buildArgs, extraEnv = {}) {
  return (prompt, task) => new Promise((resolve, reject) => {
    const proc = spawn(bin, buildArgs(prompt), {
      cwd: PROJECT_DIR,
      env: { ...process.env, HOME: process.env.HOME, ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    task.proc = proc
    const rl = createInterface({ input: proc.stdout, crlfDelay: Infinity })
    rl.on('line', line => {
      if (!line.trim()) return
      try {
        const ev = JSON.parse(line)
        const chunk = extractMcpText(ev)
        if (chunk) task.text += chunk
        task.tokens += extractMcpTokens(ev)
        if (isMcpDone(ev)) { task.status = isMcpError(ev) ? 'error' : 'done'; task.proc = null; resolve() }
      } catch {}
    })
    proc.on('close', code => {
      if (task.status === 'running') { task.status = code === 0 ? 'done' : 'error'; task.proc = null }
      resolve()
    })
    proc.on('error', err => { task.status = 'error'; task.error = err.message; task.proc = null; reject(err) })
  })
}

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload))
}

// PTY server — real interactive terminal on :3201
const PTY_PORT = process.env.CLAUDE_PTY_PORT ?? 3201
const ptywss = new WebSocketServer({ port: Number(PTY_PORT) })
console.log(`PTY Bridge listening on ws://localhost:${PTY_PORT}`)

ptywss.on('connection', (ws) => {
  console.log('[pty] client connected')
  const shell = '/bin/zsh'
  let proc
  let platformCli = null // will be set on 'init' message

  try {
    proc = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 500,
      rows: 24,
      cwd: PROJECT_DIR,
      env: {
        HOME: process.env.HOME,
        TERM: 'xterm-256color',
        SHELL: '/bin/zsh',
        PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
        USER: process.env.USER,
        LOGNAME: process.env.LOGNAME,
        TMPDIR: process.env.TMPDIR,
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        // Per-agent MCP clients (.mcp.json / config.toml in the slot) authenticate
        // to the L2 owner bridges with `Bearer ${HERMES_MCP_SECRET}`. The interactive
        // terminal passes a curated env allowlist, so the secret must be named here or
        // the agent can't resolve it. (Direct prompt-mode spawns inherit full env.)
        HERMES_MCP_SECRET: process.env.HERMES_MCP_SECRET,
      },
    })
  } catch (err) {
    console.error('[pty] spawn error:', err.message, err.stack)
    if (ws.readyState === ws.OPEN) ws.send(`\r\n[PTY error: ${err.message}]\r\n`)
    return
  }

  proc.onData((data) => {
    if (ws.readyState === ws.OPEN) ws.send(data)
  })

  proc.onExit(({ exitCode }) => {
    console.log(`[pty] exited (${exitCode})`)
    if (ws.readyState === ws.OPEN) ws.close()
  })

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString())

      // System terminal — a plain project-level shell, NO CLI launched. Used to
      // install tools, link Telegram↔Hermes, etc. zsh already spawned in app/;
      // cd up to the repo root (/opt/fractera) where the services live. Must be
      // matched BEFORE the generic platform block below (whose else-branch would
      // otherwise launch Claude for any unknown platform value).
      if (msg.type === 'init' && msg.platform === 'system' && !platformCli) {
        platformCli = 'system'
        const root = resolve(PROJECT_DIR, '..') // /opt/fractera
        setTimeout(() => { try { proc.write(`cd ${root}\n`) } catch {} }, 300)
        activePtys.set('system', (text) => { try { proc.write(text); return true } catch { return false } })
        return
      }


      if (msg.type === 'stdin' && typeof msg.data === 'string') proc.write(msg.data)
      else if (msg.type === 'resize' && msg.cols && msg.rows) proc.resize(Number(msg.cols), Number(msg.rows))
    } catch {
      proc.write(raw.toString())
    }
  })

  ws.on('close', () => {
    console.log('[pty] disconnected')
    if (platformCli) activePtys.delete(platformCli)
    try { proc.kill() } catch {}
  })

  ws.on('error', (err) => console.error('[pty] ws error:', err.message))
})

