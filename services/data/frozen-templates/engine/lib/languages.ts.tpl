// SINGLE language authority (step 149 — language-safety vaccine).
//
// There is exactly ONE source of the site's language set and ONE env var. The authority lives in
// the slot's `config/translations/translations.config.ts` (richer: metadata, native names,
// isSupportedLanguage, getAvailableLanguages) and reads `NEXT_PUBLIC_SUPPORTED_LANGUAGES` — the same
// variable every platform setter (App Settings / MCP) and the redeploy bake-in fix already write.
//
// This engine file re-exports that ONE list so the engine's SEO/alternates and any composed brick
// resolve the SAME languages as the slot's routing and switcher — they can never diverge. The old
// `NEXT_PUBLIC_LANGUAGES` variable and a second `SUPPORTED_LANGUAGES` definition are RETIRED: a
// second authority is exactly how a language ends up "supported here, unknown there" → a 500.
//
// (The Frozen Template Constructor's home is the FNS slot, which always ships
// config/translations; the engine is composed into it.)
export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@/config/translations/translations.config'
