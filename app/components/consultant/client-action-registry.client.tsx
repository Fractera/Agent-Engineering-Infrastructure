'use client'

import { useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTheme, type ThemeMode } from '@/providers/theme-provider.client'
import { useWidthToggle } from '@/providers/width-toggle-provider.client'
import { getAvailableLanguages } from '@/config/translations/translations.config'
import { isClientActionName, validateActionArgs, type ClientAction } from '@/lib/consultant/client-actions'

// Browser-side allowlist registry for the public consultant's client-actions (D3 of the
// "Интерактивный консультант" step). The consultant PROPOSES actions; THIS is the only
// place that executes them — and it executes ONLY a known name mapped to a known handler,
// after re-validating args (static shape + live config: locale ∈ configured languages).
// An anonymous internet visitor's chat can never make the browser run an arbitrary
// instruction — the security boundary on the client side (the server-side boundary is the
// public Hermes process with tier ceiling = user).

export type ActionResult = { ok: true; detail: string } | { ok: false; error: string }

export function useClientActionRunner(opts?: { parallelRouting?: boolean }): (action: ClientAction) => ActionResult {
  const router = useRouter()
  const pathname = usePathname()
  const { setTheme } = useTheme()
  const { setWidth } = useWidthToggle()

  return useCallback(
    (action: ClientAction): ActionResult => {
      // 1. Allowlist — the name must be a known client-action.
      if (!isClientActionName(action.tool)) {
        return { ok: false, error: `blocked: unknown action "${action.tool}"` }
      }
      // 2. Static-shape validation (shared with the server).
      const v = validateActionArgs(action.tool, action.args ?? {})
      if (!v.ok) return { ok: false, error: v.error }
      const args = v.args

      // 3. Execute by name, with live-config checks where needed.
      switch (action.tool) {
        case 'public_view_navigate_page': {
          const to = String(args.to)
          router.push(to)
          return { ok: true, detail: `navigated to ${to}` }
        }
        case 'public_view_set_locale': {
          const locale = String(args.locale)
          const available = getAvailableLanguages().map((l) => l.code)
          if (!available.includes(locale)) {
            return { ok: false, error: `locale "${locale}" is not configured for this site` }
          }
          const segments = pathname.split('/').filter(Boolean)
          // Strip an existing language prefix (if the first segment is a configured lang).
          if (segments.length && available.includes(segments[0])) segments.shift()
          router.replace(`/${locale}/${segments.join('/')}`)
          return { ok: true, detail: `switched language to ${locale}` }
        }
        case 'public_view_set_theme': {
          setTheme(String(args.mode) as ThemeMode)
          return { ok: true, detail: `theme set to ${args.mode}` }
        }
        case 'public_view_set_width': {
          // Width only has a consumer (MainScrollArea) in the slot layout; in flat mode it is
          // a no-op, so refuse rather than silently doing nothing (decision "width = B").
          if (!opts?.parallelRouting) {
            return { ok: false, error: 'Width adjustment is available when parallel routing is enabled.' }
          }
          setWidth(String(args.width) as 'narrow' | 'wide')
          return { ok: true, detail: `center width set to ${args.width}` }
        }
        default:
          return { ok: false, error: 'unhandled action' }
      }
    },
    [router, pathname, setTheme, setWidth]
  )
}
