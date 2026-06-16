'use client'

import { useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import type { ConsultantStrings } from '@/lib/consultant/i18n'

// Reusable key block (E3 / R8). Shown when the consultant has no API key configured, OR
// when a turn reports a key error (no/invalid key, quota). Carries the consent notice the
// developer requires ("this key is saved on the server and used in the project") and posts
// to /api/consultant/key (set-if-empty for anonymous; owner can replace). EN strings → D4.

export function ConsultantKeyBlock({
  t,
  reason,
  onSaved,
}: {
  t: ConsultantStrings
  reason: 'missing' | 'error'
  onSaved: () => void
}) {
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    const k = key.trim()
    if (!k) { setError(t.keyEnter); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/consultant/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: k }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? t.keySaveFail)
        return
      }
      setKey('')
      onSaved()
    } catch {
      setError(t.keySaveFail)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="m-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
      <div className="flex items-center gap-1.5 text-amber-700">
        <KeyRound size={13} />
        <span className="text-xs font-semibold">
          {reason === 'error' ? t.keyErrorTitle : t.keyMissingTitle}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-foreground/70">
        {reason === 'error' ? t.keyErrorDesc : t.keyMissingDesc}
      </p>
      <input
        type="password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        placeholder={t.keyPlaceholder}
        className="mt-2 h-8 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {error && <p className="mt-1 text-[11px] font-medium text-red-600">{error}</p>}
      <p className="mt-1.5 text-[10px] leading-relaxed text-foreground/50">{t.keyConsent}</p>
      <button
        onClick={save}
        disabled={saving || !key.trim()}
        className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-md bg-foreground px-3 text-[11px] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {saving && <Loader2 size={11} className="animate-spin" />}
        {t.keySave}
      </button>
    </div>
  )
}
