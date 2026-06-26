// Helpers that turn a document's _data (meta + en + per-language overrides) into the
// ContentPost the page renders and the compact item the index lists.
import { resolveEntry } from '@/lib/content/resolve'
import type { {{TAB_PASCAL}}Base, {{TAB_PASCAL}}Meta, {{TAB_PASCAL}}Override } from './types'
import type { ContentPost } from '@/lib/content/create-content-post'

const FIELDS = ['title', 'seoTitle', 'subtitle', 'description', 'summary', 'keywords'] as const

/** A post folder's _data, assembled in its _data/index.ts. */
export type {{TAB_PASCAL}}Data = {
  meta: {{TAB_PASCAL}}Meta
  en: {{TAB_PASCAL}}Base
  overrides?: Record<string, {{TAB_PASCAL}}Override>
}

function resolve(data: {{TAB_PASCAL}}Data, lang: string) {
  return resolveEntry(data.en, data.overrides, lang, FIELDS)
}

/** Map a post to the normalized ContentPost the factory renders. */
export function {{TAB_CAMEL}}Post(data: {{TAB_PASCAL}}Data, lang: string): ContentPost {
  const r = resolve(data, lang)
  return {
    title: r.title,
    seoTitle: r.seoTitle,
    subtitle: r.subtitle,
    description: r.description,
    keywords: r.keywords,
    tags: data.meta.tags,
    date: data.meta.date,
    readingMinutes: data.meta.readingMinutes,
    authorName: data.meta.author?.name,
    blocks: r.blocks,
    faq: r.faq,
    ogImage: data.meta.ogImage,
    inLanguage: lang,
    heroImage: data.meta.heroImage,
  }
}

/** Compact, localized item for the index list. */
export function {{TAB_CAMEL}}ListItem(data: {{TAB_PASCAL}}Data, lang: string) {
  const r = resolve(data, lang)
  return {
    slug: data.meta.slug,
    date: data.meta.date,
    readingMinutes: data.meta.readingMinutes,
    title: r.title,
    summary: r.summary,
  }
}

/** Build the localized, date-sorted index list from the auto-discovered POSTS
 *  array (parser-fs generates the array; this aggregates + sorts it). */
export function {{TAB_CAMEL}}List(posts: {{TAB_PASCAL}}Data[], lang: string) {
  return posts.map(d => {{TAB_CAMEL}}ListItem(d, lang)).sort((x, y) => (x.date < y.date ? 1 : -1))
}
