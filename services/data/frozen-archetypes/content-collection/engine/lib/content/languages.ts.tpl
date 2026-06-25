// FROZEN ENGINE (decoupled from FES). The site's language set, env-driven so the
// engine is portable and the set is baked at build time (a NEXT_PUBLIC_* var, see
// the build-time-env standard). Set NEXT_PUBLIC_LANGUAGES to a comma list, e.g.
// "en,ru,fr"; the FIRST entry is the default (its home page lives at the bare root).
// When unset, falls back to English-only — pages still render, hreflang lists en.
export const SUPPORTED_LANGUAGES: string[] =
  process.env.NEXT_PUBLIC_LANGUAGES?.split(',').map(s => s.trim()).filter(Boolean) ?? ['en']

export const DEFAULT_LANGUAGE: string = SUPPORTED_LANGUAGES[0] ?? 'en'
