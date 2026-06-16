'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, LogIn, Square } from 'lucide-react'
import { toast } from 'sonner'
import { registerRedirectUrl } from '@/lib/runtime-urls'
import { Shimmer } from '@/components/ai-elements/shimmer.client'
import { useClientActionRunner } from './client-action-registry.client'
import { ConsultantKeyBlock } from './consultant-key-block.client'
import type { ClientAction } from '@/lib/consultant/client-actions'
import type { ConsultantStrings } from '@/lib/consultant/i18n'

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
  authRequired?: { kind: 'personal' | 'role' }
  keyError?: boolean
}

function signIn() {
  if (typeof window !== 'undefined') window.location.href = registerRedirectUrl(window.location.href, 'user')
}

export function ConsultantChat({ t, keyConfigured, parallelRouting }: { t: ConsultantStrings; keyConfigured: boolean; parallelRouting: boolean }) {
  const runAction = useClientActionRunner({ parallelRouting })
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  // E3/R8: show the key block when no key is configured, or after a turn reports a key error.
  const [needKey, setNeedKey] = useState<null | 'missing' | 'error'>(null)
  // The key is saved on the SERVER (public Hermes pool), not per browser session — so on
  // every open we re-check the server with a small loader instead of trusting a stale prop
  // or asking again. Seeded from keyConfigured for an instant first paint, then confirmed.
  const [checkingKey, setCheckingKey] = useState(!keyConfigured)

  useEffect(() => {
    let alive = true
    fetch('/api/consultant/key')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return
        if (d && typeof d.configured === 'boolean') setNeedKey(d.configured ? null : 'missing')
      })
      .catch(() => {})
      .finally(() => { if (alive) setCheckingKey(false) })
    return () => { alive = false }
  }, [])

  const abortRef = useRef<AbortController | null>(null)

  // Stop the in-flight turn (the send button becomes a square while sending; pressing it
  // again aborts). No assistant bubble is added on a user-initiated abort.
  function stop() {
    abortRef.current?.abort()
  }

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setMessages((m) => [...m, { id: genId(), role: 'user', text }])
    setSending(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const res = await fetch('/api/consultant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(String(res.status))
      const turn = await res.json()
      if (turn.sessionId) setSessionId(turn.sessionId)
      if (turn.keyError) setNeedKey('error')
      setMessages((m) => [
        ...m,
        {
          id: genId(),
          role: 'assistant',
          text: turn.text ?? '',
          actions: Array.isArray(turn.actions) ? turn.actions : [],
          authRequired: turn.authRequired && (turn.authRequired.kind === 'personal' || turn.authRequired.kind === 'role') ? turn.authRequired : undefined,
          keyError: turn.keyError,
        },
      ])
    } catch (e) {
      // User-initiated abort is silent; any other failure shows the unavailable notice.
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setMessages((m) => [...m, { id: genId(), role: 'assistant', text: t.unavailable }])
      }
    } finally {
      abortRef.current = null
      setSending(false)
    }
  }

  function onAction(a: ClientAction) {
    const r = runAction(a)
    if (r.ok) toast.success(r.detail)
    else toast.error(r.error)
  }

  // While we confirm the key with the server, show a small loader instead of the key form,
  // so a saved key never re-prompts on reopen.
  if (checkingKey) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-foreground/50">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-xs">{t.checkingKey}</span>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && !needKey && (
          <p className="px-1 py-6 text-center text-xs text-foreground/50">{t.empty}</p>
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
              <div className="mt-1 rounded-md border border-amber-500/40 bg-amber-500/5 px-2.5 py-1.5 text-left">
                <p className="text-[11px] leading-relaxed text-foreground/70">
                  {m.authRequired.kind === 'personal' ? t.authPersonal : t.authRole}
                </p>
                <button
                  onClick={signIn}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-foreground underline-offset-2 hover:underline"
                >
                  <LogIn size={11} /> {t.signIn}
                </button>
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
        {/* ai-elements Shimmer as the in-flight indicator in the chat feed. */}
        {sending && (
          <div className="text-left">
            <Shimmer className="text-xs">{t.thinking}</Shimmer>
          </div>
        )}
        {needKey && <ConsultantKeyBlock t={t} reason={needKey} onSaved={() => setNeedKey(null)} />}
      </div>

      <div className="flex items-center gap-2 border-t border-border p-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={t.inputPlaceholder}
          aria-label={t.send}
          className="h-8 flex-1 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {/* While sending the button is a STOP square (press again to abort); otherwise Send. */}
        <button
          onClick={sending ? stop : send}
          disabled={!sending && !input.trim()}
          aria-label={sending ? t.stop : t.send}
          title={sending ? t.stop : t.send}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {sending ? <Square size={12} className="fill-current" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  )
}
