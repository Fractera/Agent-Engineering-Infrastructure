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
}
