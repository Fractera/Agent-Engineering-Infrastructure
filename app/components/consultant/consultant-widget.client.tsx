'use client'

import { useEffect, useState } from 'react'
import { Bot, X, LogIn } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { DEFAULT_LANGUAGE } from '@/config/translations/translations.config'
import { registerRedirectUrl } from '@/lib/runtime-urls'
import { resolveConsultantLang, getConsultantStrings } from '@/lib/consultant/i18n'
import { ConsultantChat } from './consultant-chat.client'

// Floating AI-consultant entry: a fixed button (bottom-right, like FES) mounted globally
// in the [lang] layout, so it appears on every page regardless of parallel routing /
// slots. Opens a docked modal with the chat. Gated on the public Hermes being reachable
// (R2): if the agent isn't connected, the button is not rendered at all. Strings come from
// the self-contained 6-language bundle (D4), resolved from the current [lang]. The R6
// role-escalation hint + Sign-in button show for non-owner tiers.

type Tier = 'public' | 'user' | 'owner'

export function ConsultantWidget() {
  const pathname = usePathname()
  const lang = resolveConsultantLang(pathname.split('/').filter(Boolean)[0], DEFAULT_LANGUAGE)
  const t = getConsultantStrings(lang)

  const [available, setAvailable] = useState(false)
  const [tier, setTier] = useState<Tier>('public')
  const [keyConfigured, setKeyConfigured] = useState(false)
  const [parallelRouting, setParallelRouting] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/consultant')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return
        setAvailable(!!d.available)
        setKeyConfigured(!!d.keyConfigured)
        setParallelRouting(!!d.parallelRouting)
        if (d.tier === 'public' || d.tier === 'user' || d.tier === 'owner') setTier(d.tier)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  if (!available) return null

  const tierLabel = tier === 'owner' ? t.tierOwner : tier === 'user' ? t.tierUser : t.tierGuest

  function signIn() {
    // requireRole 'user' = "just authenticate" (admins are a superset; their real tier
    // applies after login). Personal-data and role-capability cases both route here.
    if (typeof window !== 'undefined') window.location.href = registerRedirectUrl(window.location.href, 'user')
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={t.open}
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
              <span className="text-xs font-semibold text-foreground">{t.title}</span>
              <span className="rounded-full border border-border px-1.5 text-[10px] font-medium text-foreground/60">
                {t.you}: {tierLabel}
              </span>
            </div>
            <button onClick={() => setOpen(false)} aria-label={t.close} className="text-foreground/60 transition-colors hover:text-foreground">
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <ConsultantChat t={t} keyConfigured={keyConfigured} parallelRouting={parallelRouting} />
          </div>

          {/* Neutral persistent sign-in affordance for non-owner tiers (no false "admin").
              The CONTEXTUAL, kind-aware escalation (personal vs role) is shown inline by the
              agent via authRequired (R6). Login → registerRedirectUrl → auth → redirect back. */}
          {tier !== 'owner' && (
            <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-3 py-1.5">
              <span className="text-[10px] leading-relaxed text-foreground/55">{t.signInHint}</span>
              <button
                onClick={signIn}
                className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-foreground underline-offset-2 hover:underline"
              >
                <LogIn size={11} /> {t.signIn}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
