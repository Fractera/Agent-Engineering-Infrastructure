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

const PORT = process.env.CLAUDE_BRIDGE_PORT ?? 3200
const PROJECT_DIR = resolve(__dirname, '../../app')
const CLAUDE_BIN = process.env.CLAUDE_BIN ?? `${process.env.HOME}/.local/bin/claude`

const wss = new WebSocketServer({ port: Number(PORT) })

console.log(`Claude Code Bridge listening on ws://localhost:${PORT}`)
console.log(`Project dir: ${PROJECT_DIR}`)
console.log(`Claude bin:  ${CLAUDE_BIN}`)

// Fetch account email once at startup
let accountEmail = null
try {
  const out = execSync(`${CLAUDE_BIN} auth status`, { timeout: 5000 }).toString()
  accountEmail = JSON.parse(out).email ?? null
  console.log(`[bridge] account: ${accountEmail}`)
} catch {
  console.log('[bridge] could not fetch account email')
}

// Resolve Codex binary
function findCodexBin() {
  if (process.env.CODEX_BIN) return process.env.CODEX_BIN
  try { return execSync('which codex', { encoding: 'utf8' }).trim() } catch {}
  return 'codex'
}
const CODEX_BIN = findCodexBin()
console.log(`Codex bin:   ${CODEX_BIN}`)

// Resolve Gemini binary
function findGeminiBin() {
  if (process.env.GEMINI_BIN) return process.env.GEMINI_BIN
  try { return execSync('which gemini', { encoding: 'utf8' }).trim() } catch {}
  return 'gemini'
}
const GEMINI_BIN = findGeminiBin()
console.log(`Gemini bin:  ${GEMINI_BIN}`)

// Resolve Qwen binary
function findQwenBin() {
  if (process.env.QWEN_BIN) return process.env.QWEN_BIN
  try { return execSync('which qwen', { encoding: 'utf8' }).trim() } catch {}
  return 'qwen'
}
const QWEN_BIN = findQwenBin()
console.log(`Qwen bin:    ${QWEN_BIN}`)

// Resolve Kimi binary
function findKimiBin() {
  if (process.env.KIMI_BIN) return process.env.KIMI_BIN
  try { return execSync('which kimi', { encoding: 'utf8' }).trim() } catch {}
  return 'kimi'
}
const KIMI_BIN = findKimiBin()
console.log(`Kimi bin:    ${KIMI_BIN}`)

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload))
}

wss.on('connection', (ws) => {
  console.log('[bridge] client connected')
  let activeProcess = null

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString())

      // Return available Claude models
      if (msg.type === 'get_models') {
        send(ws, { type: 'models', platform: 'claude-code', models: [
          { id: 'claude-opus-4-7',           name: 'Claude Opus 4.7' },
          { id: 'claude-sonnet-4-6',         name: 'Claude Sonnet 4.6' },
          { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
        ]})
        return
      }

      if (msg.type !== 'stdin' || typeof msg.data !== 'string') return
      const prompt = msg.data.trim()
      const resumeSessionId = typeof msg.resumeSessionId === 'string' ? msg.resumeSessionId : null
      const lightChat = msg.lightChat === true
      if (!prompt) return

      if (activeProcess) { try { activeProcess.kill() } catch {} }

      console.log(`[bridge] prompt: "${prompt.slice(0, 80)}..." resume=${resumeSessionId ?? 'none'} lightChat=${lightChat}`)

      const args = [
        '--print',
        '--output-format', 'stream-json',
        '--include-partial-messages',
        '--verbose',
        '--dangerously-skip-permissions',
      ]
      if (lightChat) args.push('--setting-sources', 'user')
      if (resumeSessionId) args.push('--resume', resumeSessionId)
      args.push(prompt)

      const proc = spawn(CLAUDE_BIN, args, {
        cwd: PROJECT_DIR,
        env: { ...process.env, HOME: process.env.HOME },
      })

      activeProcess = proc

      const rl = createInterface({ input: proc.stdout, crlfDelay: Infinity })

      rl.on('line', (line) => {
        if (!line.trim()) return
        try {
          const event = JSON.parse(line)

          // Rate limit info — forward utilization and reset time to browser
          if (event.type === 'rate_limit_event' && event.rate_limit_info) {
            const { utilization, resetsAt, status, rateLimitType } = event.rate_limit_info
            send(ws, { type: 'rate_limit', utilization, resetsAt, status, rateLimitType, email: accountEmail })
            return
          }

          // Session ID from init event — send to browser for --resume support
          if (event.type === 'system' && event.subtype === 'init' && event.session_id) {
            send(ws, { type: 'session', sessionId: event.session_id })
            return
          }

          // Text chunk arriving — stream immediately to browser
          if (
            event.type === 'stream_event' &&
            event.event?.type === 'content_block_delta' &&
            event.event?.delta?.type === 'text_delta'
          ) {
            send(ws, { type: 'chunk', data: event.event.delta.text })
            return
          }

          // Tool use started — notify browser
          if (
            event.type === 'stream_event' &&
            event.event?.type === 'content_block_start' &&
            event.event?.content_block?.type === 'tool_use'
          ) {
            send(ws, { type: 'tool_start', name: event.event.content_block.name })
            return
          }

          // Status update (requesting, processing)
          if (event.type === 'system' && event.subtype === 'status') {
            send(ws, { type: 'status', status: event.status })
            return
          }

          // Final result — include usage stats
          if (event.type === 'result') {
            const u = event.usage ?? {}
            send(ws, {
              type: 'exit',
              code: event.is_error ? 1 : 0,
              inputTokens: u.input_tokens ?? 0,
              cacheReadTokens: u.cache_read_input_tokens ?? 0,
              cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
              outputTokens: u.output_tokens ?? 0,
              costUsd: event.total_cost_usd ?? null,
            })
            return
          }

        } catch {
          // not JSON — forward as raw text
          send(ws, { type: 'chunk', data: line + '\n' })
        }
      })

      proc.stderr.on('data', (chunk) => {
        const text = chunk.toString()
        console.error('[bridge] stderr:', text.slice(0, 200))
      })

      proc.on('close', (code) => {
        console.log(`[bridge] done (code ${code})`)
        activeProcess = null
        send(ws, { type: 'exit', code })
      })

      proc.on('error', (err) => {
        console.error('[bridge] spawn error:', err.message)
        activeProcess = null
        send(ws, { type: 'error', message: err.message })
      })

    } catch (e) {
      console.error('[bridge] parse error:', e.message)
    }
  })

  ws.on('close', () => {
    console.log('[bridge] disconnected')
    if (activeProcess) { try { activeProcess.kill() } catch {} }
  })

  ws.on('error', (err) => console.error('[bridge] ws error:', err.message))
})

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

      // Platform init — auto-launch the right CLI
      if (msg.type === 'init' && msg.platform && !platformCli) {
        platformCli = msg.platform
        const cliCmd = msg.platform === 'codex'      ? `${CODEX_BIN}\n`
                     : msg.platform === 'gemini-cli'  ? `${GEMINI_BIN}\n`
                     : msg.platform === 'qwen-code'   ? `${QWEN_BIN}\n`
                     : msg.platform === 'kimi-code'   ? `${KIMI_BIN}\n`
                     : msg.platform === 'open-code'   ? `${OPENCODE_BIN}\n`
                     : `${CLAUDE_BIN}\n`
        console.log(`[pty] platform: ${msg.platform}, launching: ${cliCmd.trim()}`)
        setTimeout(() => { try { proc.write(cliCmd) } catch {} }, 800)
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
    try { proc.kill() } catch {}
  })

  ws.on('error', (err) => console.error('[pty] ws error:', err.message))
})

// Codex bridge on :3202
const CODEX_PORT = process.env.CLAUDE_CODEX_PORT ?? 3202
const codexwss = new WebSocketServer({ port: Number(CODEX_PORT) })
console.log(`Codex Bridge listening on ws://localhost:${CODEX_PORT}`)

codexwss.on('connection', (ws) => {
  console.log('[codex] client connected')
  let activeProcess = null

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString())

      // Return available Codex models from local cache
      if (msg.type === 'get_models') {
        try {
          const cacheFile = `${process.env.HOME}/.codex/models_cache.json`
          const cache = JSON.parse(readFileSync(cacheFile, 'utf8'))
          const models = cache.models
            .filter(m => m.visibility === 'list')
            .map(m => ({ id: m.slug, name: m.display_name, description: m.description }))
          send(ws, { type: 'models', platform: 'codex', models })
        } catch {
          send(ws, { type: 'models', platform: 'codex', models: [
            { id: 'gpt-5.4',       name: 'GPT-5.4' },
            { id: 'gpt-5.4-mini',  name: 'GPT-5.4 Mini' },
            { id: 'gpt-5.3-codex', name: 'GPT-5.3 Codex' },
          ]})
        }
        return
      }

      if (msg.type !== 'stdin' || typeof msg.data !== 'string') return
      const prompt = msg.data.trim()
      if (!prompt) return

      if (activeProcess) { try { activeProcess.kill() } catch {} }

      console.log(`[codex] prompt: "${prompt.slice(0, 80)}..."`)

      const args = ['exec', '--json', '--sandbox', 'workspace-write']
      if (msg.model) args.push('--model', msg.model)
      args.push(prompt)

      const proc = spawn(CODEX_BIN, args, {
        cwd: PROJECT_DIR,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      activeProcess = proc

      const rl = createInterface({ input: proc.stdout, crlfDelay: Infinity })

      rl.on('line', (line) => {
        if (!line.trim()) return
        try {
          const event = JSON.parse(line)
          // Item completed — main response event with full text
          if (event.type === 'item.completed' && event.item?.text) {
            send(ws, { type: 'chunk', data: event.item.text })
            return
          }

          // Turn completed — send usage and exit
          if (event.type === 'turn.completed') {
            const u = event.usage ?? {}
            send(ws, {
              type: 'exit',
              code: 0,
              inputTokens: u.input_tokens ?? 0,
              cacheReadTokens: u.cached_input_tokens ?? 0,
              cacheWriteTokens: 0,
              outputTokens: u.output_tokens ?? 0,
              costUsd: null,
            })
            return
          }

          // Turn failed
          if (event.type === 'turn.failed') {
            const errMsg = event.error?.message ?? 'Codex error'
            send(ws, { type: 'chunk', data: `\n[Error: ${errMsg}]\n` })
            send(ws, { type: 'exit', code: 1 })
            return
          }

          // Auth error — show instructions immediately and kill process
          if (event.type === 'error') {
            if (event.message?.includes('401') || event.message?.includes('Unauthorized')) {
              send(ws, { type: 'chunk', data: '⚠️ Codex not authenticated.\n\nTo connect Codex, run one of these commands in your terminal:\n\n  codex login\n\nOr for server / device auth:\n\n  codex login --device-auth\n\nAfter login, try your message again.\n' })
              send(ws, { type: 'exit', code: 1 })
              try { proc.kill() } catch {}
              activeProcess = null
            }
            return
          }

        } catch {
          send(ws, { type: 'chunk', data: line + '\n' })
        }
      })

      let authErrorSent = false
      proc.stderr.on('data', (chunk) => {
        const text = chunk.toString()
        if ((text.includes('401') || text.includes('Unauthorized')) && !authErrorSent) {
          authErrorSent = true
          send(ws, { type: 'chunk', data: '⚠️ Codex not authenticated.\n\nRun in your terminal:\n\n  codex login\n\nOr for device/server auth:\n\n  codex login --device-auth\n\nAfter login, try again.\n' })
          send(ws, { type: 'exit', code: 1 })
          try { proc.kill() } catch {}
          activeProcess = null
        }
      })

      proc.on('close', (code) => {
        console.log(`[codex] done (code ${code})`)
        activeProcess = null
        send(ws, { type: 'exit', code })
      })

      proc.on('error', (err) => {
        console.error('[codex] spawn error:', err.message)
        activeProcess = null
        send(ws, { type: 'error', message: err.message })
      })

    } catch (e) {
      console.error('[codex] parse error:', e.message)
    }
  })

  ws.on('close', () => {
    console.log('[codex] disconnected')
    if (activeProcess) { try { activeProcess.kill() } catch {} }
  })

  ws.on('error', (err) => console.error('[codex] ws error:', err.message))
})

// Gemini CLI bridge on :3203
const GEMINI_PORT = process.env.CLAUDE_GEMINI_PORT ?? 3203
const geminiwss = new WebSocketServer({ port: Number(GEMINI_PORT) })
console.log(`Gemini Bridge listening on ws://localhost:${GEMINI_PORT}`)

geminiwss.on('connection', (ws) => {
  console.log('[gemini] client connected')
  let activeProcess = null

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString())

      // Return available Gemini models (hardcoded — no local cache)
      if (msg.type === 'get_models') {
        send(ws, { type: 'models', platform: 'gemini-cli', models: [
          { id: 'gemini-2.5-pro',   name: 'Gemini 2.5 Pro'   },
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash'  },
          { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash'  },
        ]})
        return
      }

      if (msg.type !== 'stdin' || typeof msg.data !== 'string') return
      const prompt = msg.data.trim()
      if (!prompt) return

      if (activeProcess) { try { activeProcess.kill() } catch {} }

      console.log(`[gemini] prompt: "${prompt.slice(0, 80)}..."`)

      const args = [
        '--prompt', prompt,
        '--output-format', 'stream-json',
        '--yolo',
        '--skip-trust',
      ]
      if (msg.model) args.push('--model', msg.model)

      const proc = spawn(GEMINI_BIN, args, {
        cwd: PROJECT_DIR,
        env: {
          ...process.env,
          HOME: process.env.HOME,
          GOOGLE_GENAI_USE_GCA: 'true',  // Use Google account subscription, no API key
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      activeProcess = proc

      const rl = createInterface({ input: proc.stdout, crlfDelay: Infinity })

      rl.on('line', (line) => {
        if (!line.trim()) return
        try {
          const event = JSON.parse(line)

          // Session init — capture session_id
          if (event.type === 'init' && event.session_id) {
            send(ws, { type: 'session', sessionId: event.session_id })
            return
          }

          // Text content chunk
          if (event.type === 'content' && event.value) {
            send(ws, { type: 'chunk', data: event.value })
            return
          }

          // Tool use started
          if (event.type === 'tool_call' && event.name) {
            send(ws, { type: 'tool_start', name: event.name })
            return
          }

          // Turn complete — send usage and exit
          if (event.type === 'turn_complete') {
            const u = event.stats ?? {}
            send(ws, {
              type: 'exit',
              code: 0,
              inputTokens: u.input_tokens ?? 0,
              cacheReadTokens: u.cached_tokens ?? 0,
              cacheWriteTokens: 0,
              outputTokens: u.output_tokens ?? 0,
              costUsd: null,
            })
            return
          }

          // Error event
          if (event.type === 'error') {
            const isAuth = event.message?.includes('Auth') || event.message?.includes('UNAUTHENTICATED')
            if (isAuth) {
              send(ws, { type: 'chunk', data: '⚠️ Gemini not authenticated.\n\nRun in your terminal:\n\n  gemini auth\n\nOr set GOOGLE_GENAI_USE_GCA=true in your environment.\n\nAfter login, try again.\n' })
              send(ws, { type: 'exit', code: 1 })
              try { proc.kill() } catch {}
              activeProcess = null
            }
            return
          }

        } catch {
          // Non-JSON line — forward as text if not empty noise
          const clean = line.trim()
          if (clean && !clean.startsWith('YOLO mode') && !clean.startsWith('Approval mode')) {
            send(ws, { type: 'chunk', data: clean + '\n' })
          }
        }
      })

      let authErrorSent = false
      proc.stderr.on('data', (chunk) => {
        const text = chunk.toString()
        if ((text.includes('UNAUTHENTICATED') || text.includes('Please set an Auth')) && !authErrorSent) {
          authErrorSent = true
          send(ws, { type: 'chunk', data: '⚠️ Gemini not authenticated.\n\nRun in your terminal:\n\n  gemini auth\n\nAfter login, try again.\n' })
          send(ws, { type: 'exit', code: 1 })
          try { proc.kill() } catch {}
          activeProcess = null
        }
        console.error('[gemini] stderr:', text.slice(0, 200))
      })

      proc.on('close', (code) => {
        console.log(`[gemini] done (code ${code})`)
        activeProcess = null
        send(ws, { type: 'exit', code })
      })

      proc.on('error', (err) => {
        console.error('[gemini] spawn error:', err.message)
        activeProcess = null
        send(ws, { type: 'error', message: err.message })
      })

    } catch (e) {
      console.error('[gemini] parse error:', e.message)
    }
  })

  ws.on('close', () => {
    console.log('[gemini] disconnected')
    if (activeProcess) { try { activeProcess.kill() } catch {} }
  })

  ws.on('error', (err) => console.error('[gemini] ws error:', err.message))
})

// Qwen Code bridge on :3204
// Event format is identical to Claude Code (same stream-json spec)
const QWEN_PORT = process.env.CLAUDE_QWEN_PORT ?? 3204
const qwenwss = new WebSocketServer({ port: Number(QWEN_PORT) })
console.log(`Qwen Bridge  listening on ws://localhost:${QWEN_PORT}`)

qwenwss.on('connection', (ws) => {
  console.log('[qwen] client connected')
  let activeProcess = null

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString())

      // Return available Qwen models
      if (msg.type === 'get_models') {
        send(ws, { type: 'models', platform: 'qwen-code', models: [
          { id: 'qwen3-plus',   name: 'Qwen3 Plus'   },
          { id: 'qwen3',        name: 'Qwen3'         },
          { id: 'qwen2.5-coder-32b-instruct', name: 'Qwen2.5 Coder 32B' },
        ]})
        return
      }

      if (msg.type !== 'stdin' || typeof msg.data !== 'string') return
      const prompt = msg.data.trim()
      if (!prompt) return

      if (activeProcess) { try { activeProcess.kill() } catch {} }

      console.log(`[qwen] prompt: "${prompt.slice(0, 80)}..."`)

      // Qwen CLI uses positional prompt — identical flags to Claude Code
      const args = [
        '--output-format', 'stream-json',
        '--yolo',
      ]
      if (msg.model) args.push('--model', msg.model)
      args.push(prompt)

      const proc = spawn(QWEN_BIN, args, {
        cwd: PROJECT_DIR,
        env: { ...process.env, HOME: process.env.HOME },
      })

      activeProcess = proc

      const rl = createInterface({ input: proc.stdout, crlfDelay: Infinity })

      rl.on('line', (line) => {
        if (!line.trim()) return
        try {
          const event = JSON.parse(line)

          // Session init
          if (event.type === 'system' && event.subtype === 'init' && event.session_id) {
            send(ws, { type: 'session', sessionId: event.session_id })
            return
          }

          // Text chunk — assistant message with content blocks
          if (event.type === 'assistant' && Array.isArray(event.message?.content)) {
            for (const block of event.message.content) {
              if (block.type === 'text' && block.text) {
                send(ws, { type: 'chunk', data: block.text })
              }
            }
            return
          }

          // Tool use started
          if (
            event.type === 'assistant' &&
            event.message?.content?.some?.((b) => b.type === 'tool_use')
          ) {
            const toolBlock = event.message.content.find((b) => b.type === 'tool_use')
            if (toolBlock?.name) send(ws, { type: 'tool_start', name: toolBlock.name })
            return
          }

          // Final result with usage — identical to Claude Code
          if (event.type === 'result') {
            const u = event.usage ?? {}
            send(ws, {
              type: 'exit',
              code: event.is_error ? 1 : 0,
              inputTokens: u.input_tokens ?? 0,
              cacheReadTokens: u.cache_read_input_tokens ?? 0,
              cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
              outputTokens: u.output_tokens ?? 0,
              costUsd: null,
            })
            return
          }

        } catch {
          send(ws, { type: 'chunk', data: line + '\n' })
        }
      })

      proc.stderr.on('data', (chunk) => {
        const text = chunk.toString()
        const isAuth = text.includes('401') || text.includes('invalid access token') || text.includes('token expired')
        if (isAuth) {
          send(ws, { type: 'chunk', data: '⚠️ Qwen not authenticated.\n\nRun in your terminal:\n\n  qwen auth\n\nAfter login, try again.\n' })
          send(ws, { type: 'exit', code: 1 })
          try { proc.kill() } catch {}
          activeProcess = null
        }
        console.error('[qwen] stderr:', text.slice(0, 200))
      })

      proc.on('close', (code) => {
        console.log(`[qwen] done (code ${code})`)
        activeProcess = null
        send(ws, { type: 'exit', code })
      })

      proc.on('error', (err) => {
        console.error('[qwen] spawn error:', err.message)
        activeProcess = null
        send(ws, { type: 'error', message: err.message })
      })

    } catch (e) {
      console.error('[qwen] parse error:', e.message)
    }
  })

  ws.on('close', () => {
    console.log('[qwen] disconnected')
    if (activeProcess) { try { activeProcess.kill() } catch {} }
  })

  ws.on('error', (err) => console.error('[qwen] ws error:', err.message))
})

// Kimi Code bridge on :3205
// Event format is identical to Claude Code (same stream-json spec)
const KIMI_PORT = process.env.CLAUDE_KIMI_PORT ?? 3205
const kimiwss = new WebSocketServer({ port: Number(KIMI_PORT) })
console.log(`Kimi Bridge  listening on ws://localhost:${KIMI_PORT}`)

kimiwss.on('connection', (ws) => {
  console.log('[kimi] client connected')
  let activeProcess = null

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString())

      if (msg.type === 'get_models') {
        send(ws, { type: 'models', platform: 'kimi-code', models: [
          { id: 'kimi-k2',      name: 'Kimi K2'      },
          { id: 'moonshot-v1',  name: 'Moonshot v1'  },
        ]})
        return
      }

      if (msg.type !== 'stdin' || typeof msg.data !== 'string') return
      const prompt = msg.data.trim()
      if (!prompt) return

      if (activeProcess) { try { activeProcess.kill() } catch {} }

      console.log(`[kimi] prompt: "${prompt.slice(0, 80)}..."`)

      // Kimi uses --print + --prompt flags (identical pattern to Claude Code)
      const args = [
        '--print',
        '--output-format', 'stream-json',
        '--yolo',
      ]
      if (msg.model) args.push('--model', msg.model)
      args.push('--prompt', prompt)

      const proc = spawn(KIMI_BIN, args, {
        cwd: PROJECT_DIR,
        env: { ...process.env, HOME: process.env.HOME },
      })

      activeProcess = proc

      const rl = createInterface({ input: proc.stdout, crlfDelay: Infinity })

      rl.on('line', (line) => {
        if (!line.trim()) return
        try {
          const event = JSON.parse(line)

          // Session init
          if (event.type === 'system' && event.subtype === 'init' && event.session_id) {
            send(ws, { type: 'session', sessionId: event.session_id })
            return
          }

          // Text chunk
          if (event.type === 'assistant' && Array.isArray(event.message?.content)) {
            for (const block of event.message.content) {
              if (block.type === 'text' && block.text) {
                send(ws, { type: 'chunk', data: block.text })
              }
            }
            return
          }

          // Tool use
          if (event.type === 'assistant') {
            const toolBlock = event.message?.content?.find?.((b) => b.type === 'tool_use')
            if (toolBlock?.name) send(ws, { type: 'tool_start', name: toolBlock.name })
            return
          }

          // Final result
          if (event.type === 'result') {
            const u = event.usage ?? {}
            send(ws, {
              type: 'exit',
              code: event.is_error ? 1 : 0,
              inputTokens: u.input_tokens ?? 0,
              cacheReadTokens: u.cache_read_input_tokens ?? 0,
              cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
              outputTokens: u.output_tokens ?? 0,
              costUsd: null,
            })
            return
          }

        } catch {
          send(ws, { type: 'chunk', data: line + '\n' })
        }
      })

      proc.stderr.on('data', (chunk) => {
        const text = chunk.toString()
        const isAuth = text.includes('LLM not set') || text.includes('login') || text.includes('unauthorized')
        if (isAuth) {
          send(ws, { type: 'chunk', data: '⚠️ Kimi not authenticated.\n\nRun in your terminal:\n\n  kimi login\n\nAfter login, try again.\n' })
          send(ws, { type: 'exit', code: 1 })
          try { proc.kill() } catch {}
          activeProcess = null
        }
        console.error('[kimi] stderr:', text.slice(0, 200))
      })

      proc.on('close', (code) => {
        console.log(`[kimi] done (code ${code})`)
        activeProcess = null
        send(ws, { type: 'exit', code })
      })

      proc.on('error', (err) => {
        console.error('[kimi] spawn error:', err.message)
        activeProcess = null
        send(ws, { type: 'error', message: err.message })
      })

    } catch (e) {
      console.error('[kimi] parse error:', e.message)
    }
  })

  ws.on('close', () => {
    console.log('[kimi] disconnected')
    if (activeProcess) { try { activeProcess.kill() } catch {} }
  })

  ws.on('error', (err) => console.error('[kimi] ws error:', err.message))
})

// Open Code bridge on :3206 (OpenRouter via opencode CLI)
const OPENCODE_PORT = process.env.CLAUDE_OPENCODE_PORT ?? 3206
const opencodewss = new WebSocketServer({ port: Number(OPENCODE_PORT) })
console.log(`OpenCode Bridge listening on ws://localhost:${OPENCODE_PORT}`)

function findOpenCodeBin() {
  if (process.env.OPENCODE_BIN) return process.env.OPENCODE_BIN
  try { return execSync('which opencode', { encoding: 'utf8' }).trim() } catch {}
  return 'opencode'
}
const OPENCODE_BIN = findOpenCodeBin()
console.log(`OpenCode bin: ${OPENCODE_BIN}`)

opencodewss.on('connection', (ws) => {
  console.log('[opencode] client connected')
  let activeProcess = null

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString())

      if (msg.type === 'get_models') {
        const keyConfigured = !!(process.env.OPENROUTER_API_KEY)
        send(ws, { type: 'models', platform: 'open-code', keyConfigured, models: keyConfigured ? [
          { id: 'deepseek/deepseek-r1',          name: 'DeepSeek R1 (free)'     },
          { id: 'meta-llama/llama-3.3-70b',       name: 'Llama 3.3 70B (free)'   },
          { id: 'mistralai/mistral-7b-instruct',  name: 'Mistral 7B (free)'      },
          { id: 'deepseek/deepseek-chat',         name: 'DeepSeek Chat'          },
          { id: 'openai/gpt-4o-mini',             name: 'GPT-4o Mini'            },
        ] : [] })
        return
      }

      if (msg.type !== 'stdin' || typeof msg.data !== 'string') return
      const prompt = msg.data.trim()
      if (!prompt) return

      if (!process.env.OPENROUTER_API_KEY) {
        send(ws, { type: 'chunk', data: '⚠️ OpenRouter API key not configured.\n\nAdd to .env.local:\n  OPENROUTER_API_KEY=your_key_here\n\nGet a free key at: openrouter.ai/keys\n' })
        send(ws, { type: 'exit', code: 1 })
        return
      }

      if (activeProcess) { try { activeProcess.kill() } catch {} }

      console.log(`[opencode] prompt: "${prompt.slice(0, 80)}..."`)

      const model = msg.model ?? 'deepseek/deepseek-r1'
      const args = ['run', '--command', 'message', '--format', 'json', '--model', `openrouter/${model}`, '--prompt', prompt]

      const proc = spawn(OPENCODE_BIN, args, {
        cwd: PROJECT_DIR,
        env: { ...process.env, OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY },
      })

      activeProcess = proc

      const rl = createInterface({ input: proc.stdout, crlfDelay: Infinity })

      rl.on('line', (line) => {
        if (!line.trim()) return
        try {
          const event = JSON.parse(line)
          if (event.type === 'system' && event.subtype === 'init' && event.session_id) {
            send(ws, { type: 'session', sessionId: event.session_id })
            return
          }
          if (event.type === 'assistant' && Array.isArray(event.message?.content)) {
            for (const block of event.message.content) {
              if (block.type === 'text' && block.text) send(ws, { type: 'chunk', data: block.text })
            }
            return
          }
          if (event.type === 'result') {
            const u = event.usage ?? {}
            send(ws, { type: 'exit', code: event.is_error ? 1 : 0, inputTokens: u.input_tokens ?? 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: u.output_tokens ?? 0, costUsd: null })
            return
          }
        } catch {
          send(ws, { type: 'chunk', data: line + '\n' })
        }
      })

      proc.stderr.on('data', (chunk) => console.error('[opencode] stderr:', chunk.toString().slice(0, 200)))

      proc.on('close', (code) => {
        console.log(`[opencode] done (code ${code})`)
        activeProcess = null
        send(ws, { type: 'exit', code })
      })

      proc.on('error', (err) => {
        activeProcess = null
        send(ws, { type: 'error', message: err.message })
      })

    } catch (e) {
      console.error('[opencode] parse error:', e.message)
    }
  })

  ws.on('close', () => {
    if (activeProcess) { try { activeProcess.kill() } catch {} }
  })

  ws.on('error', (err) => console.error('[opencode] ws error:', err.message))
})