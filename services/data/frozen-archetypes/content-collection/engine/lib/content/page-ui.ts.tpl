import type { DeepPartial } from '@/lib/utils/deep-merge'
import { deepMerge } from '@/lib/utils/deep-merge'

// Generic UI chrome shared by every StandardContentPage (the reusable page
// template): the table-of-contents heading and the FAQ heading. Page-specific
// labels (breadcrumb, back link) are passed in as props; these two are the same
// on every page, so they live here. Same per-key EN-fallback contract as the
// rest of the i18n shell — add a language by adding an entry.
export type PageUi = {
  tocHeading: string
  faqHeading: string
}

const en: PageUi = {
  tocHeading: 'On this page',
  faqHeading: 'Frequently asked questions',
}

const ru: DeepPartial<PageUi> = {
  tocHeading: 'На этой странице',
  faqHeading: 'Частые вопросы',
}

const UI: Record<string, DeepPartial<PageUi>> = { en, ru }

export function getPageUi(lang: string): PageUi {
  return deepMerge<PageUi>(en, UI[lang])
}
