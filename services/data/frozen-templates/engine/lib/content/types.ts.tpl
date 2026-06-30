// Generic contract for any per-document, per-language content collection
// (news today; blog/documentation reuse it once they stop being EN-only).
// TBase = the base-language document (all translatable fields required).
// TOverride = a partial per-language override (same translatable fields, all optional),
// plus an optional `headings` map for swapping individual h2 text without
// replacing the whole `blocks` array.

import type { Block, FaqPair } from './blocks/types'

export type LocalizedBody = {
  blocks: Block[]
  faq?: FaqPair[]
}

export type LocalizedBodyOverride = {
  headings?: Record<string, string>
  blocks?: Block[]
  faq?: FaqPair[]
  // Set true on a per-language override that is a structural SEED still carrying the
  // default language's text (not yet translated). The page renders it but declares
  // `noindex` so Google never indexes a cross-language duplicate (Doorway guard).
  // The translation runner clears it once real translated strings are written.
  needsTranslation?: boolean
}
