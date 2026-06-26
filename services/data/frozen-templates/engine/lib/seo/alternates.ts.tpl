import type { Metadata } from 'next'
import { BRAND } from '@/lib/brand'
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@/lib/languages'

// FROZEN ENGINE (decoupled from FES). Per-page canonical + hreflang. Origin comes
// from BRAND.siteUrl (env-driven, not hardcoded); the language set comes from
// lib/content/languages (NEXT_PUBLIC_LANGUAGES). The home page of the DEFAULT
// language lives at the bare root; every other URL is /<lang><subPath>.
function urlFor(lang: string, subPath: string): string {
  const base = BRAND.siteUrl
  if (subPath === '') return lang === DEFAULT_LANGUAGE ? `${base}/` : `${base}/${lang}`
  return `${base}/${lang}${subPath}`
}

// Each page declares ITSELF as canonical; hreflang advertises the same page in
// every supported language. `subPath` is '' for a home page, '/slug' otherwise.
export function buildAlternates(lang: string, subPath = ''): Metadata['alternates'] {
  return {
    canonical: urlFor(lang, subPath),
    languages: {
      'x-default': urlFor(DEFAULT_LANGUAGE, subPath),
      ...Object.fromEntries(SUPPORTED_LANGUAGES.map(l => [l, urlFor(l, subPath)])),
    },
  }
}
