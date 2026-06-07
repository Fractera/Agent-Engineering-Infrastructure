import { createServer } from 'http'
import { randomUUID } from 'crypto'

function toolsSchema(platform) {
  return [
    { name: 'send_prompt',           description: `Send a prompt to ${platform}`,       inputSchema: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] } },
    { name: 'get_response',          description: 'Poll task result',                    inputSchema: { type: 'object', properties: { task_id: { type: 'string' }, wait_ms: { type: 'number' } }, required: ['task_id'] } },
    { name: 'cancel_task',           description: 'Cancel a running task',               inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
    { name: 'get_status',            description: `${platform} busy status`,             inputSchema: { type: 'object', properties: {} } },
    { name: 'send_text_to_terminal', description: 'Write text to active PTY stdin',      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
  ]
}

function textResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] }
}

export class PlatformMcpServer {
  constructor({ platform, port, secret, runPrompt, writeToPty }) {
    this.platform  = platform
    this.port      = port
    this.secret    = secret
    this.runPrompt = runPrompt
    this.writeToPty = writeToPty
    this.tasks = new Map()
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
        res.end(JSON.stringify({ ok: true, platform: this.platform })); return
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
      console.log(`[mcp:${this.platform}] http://127.0.0.1:${this.port}`)
    )
  }

  _handle(rpc, res) {
    const { id, method, params } = rpc
    const ok   = r  => res.end(JSON.stringify({ jsonrpc: '2.0', id, result: r }))
    const fail = (c, m) => res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: c, message: m } }))

    if (method === 'tools/list') return ok({ tools: toolsSchema(this.platform) })
    if (method === 'tools/call') return this._call(params?.name, params?.arguments ?? {}).then(ok).catch(e => fail(-32603, e.message))
    fail(-32601, `Method not found: ${method}`)
  }

  async _call(name, args) {
    switch (name) {
      case 'send_prompt': {
        if (!args.prompt) throw new Error('prompt required')
        const task_id = randomUUID()
        const task = { status: 'running', text: '', error: null, proc: null, tokens: 0 }
        this.tasks.set(task_id, task)
        this.runPrompt(args.prompt, task).catch(e => { task.status = 'error'; task.error = e.message })
        return textResult({ task_id })
      }
      case 'get_response': {
        const task = this.tasks.get(args.task_id)
        if (!task) return textResult({ status: 'not_found' })
        if ((args.wait_ms ?? 0) > 0 && task.status === 'running')
          await new Promise(r => setTimeout(r, Math.min(args.wait_ms, 30000)))
        return textResult({ status: task.status, text: task.text, tokens: task.tokens, ...(task.error && { error: task.error }) })
      }
      case 'cancel_task': {
        const task = this.tasks.get(args.task_id)
        if (task?.proc) try { task.proc.kill() } catch {}
        if (task) { task.status = 'cancelled'; task.proc = null }
        return textResult({ ok: !!task })
      }
      case 'get_status': {
        const entry = [...this.tasks.entries()].find(([, t]) => t.status === 'running')
        return textResult({ busy: !!entry, current_task: entry?.[0] ?? null })
      }
      case 'send_text_to_terminal': {
        if (!args.text) throw new Error('text required')
        return textResult({ ok: this.writeToPty(args.text) })
      }
      default: throw new Error(`Unknown tool: ${name}`)
    }
  }
}
