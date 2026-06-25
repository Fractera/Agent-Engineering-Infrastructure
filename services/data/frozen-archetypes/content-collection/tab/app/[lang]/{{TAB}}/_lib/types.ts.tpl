// FROZEN ARCHETYPE TEMPLATE — content-collection. Thawed by thaw-frozen-archetype.
// Tokens ({{TAB}}, {{TAB_PASCAL}}, {{TAB_CAMEL}}) are substituted at thaw time.
// Per-document file structure: every article lives in its own co-located route
// folder `app/[lang]/{{TAB}}/<slug>/_data/` — meta.ts (non-translatable) + en.ts
// (required base body) + one <lang>.ts partial override per extra language.

import type { LocalizedBody, LocalizedBodyOverride } from '@/lib/content/types'

export type {{TAB_PASCAL}}Meta = {
  slug: string
  date: string
  readingMinutes: number
  tags: string[]
  author?: { name: string; role: string }
  heroImage?: string
  ogImage: string
}

export type {{TAB_PASCAL}}Base = LocalizedBody & {
  title: string
  seoTitle?: string
  subtitle?: string
  description: string
  summary: string
  keywords?: string
}

export type {{TAB_PASCAL}}Override = LocalizedBodyOverride & {
  title?: string
  seoTitle?: string
  subtitle?: string
  description?: string
  summary?: string
  keywords?: string
}

// The tab's UI chrome (index + article wrapper labels). Strings live in
// ../_data/{en,<lang>}.ts (rule: localized data, never hardcoded inline). Each
// extra language file is a PARTIAL override; getX Ui deep-merges it over en, so a
// new language needs only its translated label — the rest inherits en.
export type {{TAB_PASCAL}}Ui = {
  metaTitle: string
  metaDescription: string
  eyebrow: string
  indexTitle: string
  indexIntro: string
  breadcrumb: string
  minRead: string
  tocHeading: string
  faqHeading: string
  back: string
  // <title> suffix on the article page — " | <titleSuffix>" after the SEO title.
  titleSuffix: string
}
