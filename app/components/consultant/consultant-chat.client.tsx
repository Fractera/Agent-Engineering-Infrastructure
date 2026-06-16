'use client'

import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useClientActionRunner } from './client-action-registry.client'
import type { ClientAction } from '@/lib/consultant/client-actions'

// Chat surface inside the consultant modal. Sends a turn to /api/consultant and renders
// the assistant text plus any proposed client-actions as buttons; a click runs the
// browser-side runner (allowlisted). EN strings hardcoded for v1 — D4 moves them to i18n.

function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

type Msg = {
  id: string
  role: 'user' | 'assistant'
  text: string
  actions?: ClientAction[]
  authRequired?: { reason: string; link: string }
  keyError?: boolean
}

export function ConsultantChat() {
  const runAction = useClientActionRunner()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setMessages((m) => [...m, { id: genId(), role: 'user', text }])
    setSending(true)
    try {
      const res = await fetch('/api/consultant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId }),
      })
      if (!res.ok) throw new Error(String(res.status))
      const turn = await res.json()
      if (turn.sessionId) setSessionId(turn.sessionId)
      setMessages((m) => [
        ...m,
        {
          id: genId(),
          role: 'assistant',
          text: turn.text ?? '',
          actions: Array.isArray(turn.actions) ? turn.actions : [],
          authRequired: turn.authRequired,
          keyError: turn.keyError,
        },
      ])
    } catch {
      setMessages((m) => [
        ...m,
        { id: genId(), role: 'assistant', text: 'Sorry — the consultant is unavailable right now.' },
      ])
    } finally {
      setSending(false)
    }
  }

  function onAction(a: ClientAction) {
    const r = runAction(a)
    if (r.ok) toast.success(r.detail)
    else toast.error(r.error)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-foreground/50">
            Ask a question or request something — e.g. “what languages does this site support?”
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div
              className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                m.role === 'user' ? 'bg-foreground text-background' : 'bg-muted text-foreground'
              }`}
            >
              {m.text}
            </div>
            {m.authRequired && (
              <div className="mt-1 text-left text-[11px] text-amber-600">
                {m.authRequired.reason}{' '}
                <a href={m.authRequired.link} className="font-semibold underline">sign in</a>
              </div>
            )}
            {!!m.actions?.length && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {m.actions.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => onAction(a)}
                    className="rounded-md border border-foreground/30 px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-border p-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask or request…"
          className="h-8 flex-1 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  )
}
