// The site's language set. Set NEXT_PUBLIC_LANGUAGES to a comma list, e.g. "en,ru,fr"
// (baked at build time — needs a rebuild to change); the FIRST entry is the default
// and its home page lives at the bare root. Unset = English only.
export const SUPPORTED_LANGUAGES: string[] =
  process.env.NEXT_PUBLIC_LANGUAGES?.split(',').map(s => s.trim()).filter(Boolean) ?? ['en']

export const DEFAULT_LANGUAGE: string = SUPPORTED_LANGUAGES[0] ?? 'en'
