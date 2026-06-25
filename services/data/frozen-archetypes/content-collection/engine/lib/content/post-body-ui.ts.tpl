import type { DeepPartial } from '@/lib/utils/deep-merge'
import { deepMerge } from '@/lib/utils/deep-merge'

// UI chrome strings for the shared PostBody renderer (used by news, blog and
// documentation). These are the few labels PostBody itself emits — e.g. the
// `docref` block's heading and download button — rather than article content.
// Same per-key EN-fallback contract as the rest of the i18n shell.
export type PostBodyUi = {
  fullDocumentation: string
  downloadMd: string
}

const en: PostBodyUi = {
  fullDocumentation: 'Full documentation',
  downloadMd: 'Download .md',
}

const ru: DeepPartial<PostBodyUi> = {
  fullDocumentation: 'Полная документация',
  downloadMd: 'Скачать .md',
}

const UI: Record<string, DeepPartial<PostBodyUi>> = { en, ru }

export function getPostBodyUi(lang: string): PostBodyUi {
  return deepMerge<PostBodyUi>(en, UI[lang])
}
