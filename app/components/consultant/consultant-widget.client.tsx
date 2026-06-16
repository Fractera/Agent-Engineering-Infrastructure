'use client'

import { useEffect, useState } from 'react'
import { Bot, X } from 'lucide-react'
import { ConsultantChat } from './consultant-chat.client'

// Floating AI-consultant entry: a fixed button (bottom-right, like FES) mounted globally
// in the [lang] layout, so it appears on every page regardless of parallel routing /
// slots. Opens a docked modal with the chat. Gated on the public Hermes being reachable
// (R2): if the agent isn't connected, the button is not rendered at all. EN strings
// hardcoded for v1 — D4 moves them to i18n. Tier badge from /api/consultant (server-resolved).

type Tier = 'public' | 'user' | 'owner'
const TIER_LABEL: Record<Tier, string> = { public: 'Guest', user: 'User', owner: 'Owner' }

export function ConsultantWidget() {
  const [available, setAvailable] = useState(false)
  const [tier, setTier] = useState<Tier>('public')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/consultant')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return
        setAvailable(!!d.available)
        if (d.tier === 'public' || d.tier === 'user' || d.tier === 'owner') setTier(d.tier)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  if (!available) return null

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI consultant"
          className="fixed bottom-5 right-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-105"
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground/40" />
          <Bot size={20} className="relative" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <Bot size={15} className="text-foreground/70" />
              <span className="text-xs font-semibold text-foreground">AI consultant</span>
              <span className="rounded-full border border-border px-1.5 text-[10px] font-medium text-foreground/60">
                You: {TIER_LABEL[tier]}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-foreground/60 transition-colors hover:text-foreground"
            >
              <X size={15} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ConsultantChat />
          </div>
        </div>
      )}
    </>
  )
}
