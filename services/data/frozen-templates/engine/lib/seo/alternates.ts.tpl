import type { Metadata } from 'next'
import { BRAND } from '@/lib/brand'
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@/lib/languages'

// Per-page canonical + hreflang. Origin from BRAND.siteUrl, languages from
// lib/languages. The default language's home is the bare root; others are /<lang><subPath>.
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
