import { meta } from './meta'
import { en } from './en'
{{POST_OVERRIDE_IMPORTS}}
import type { {{TAB_PASCAL}}Data } from '../../_lib/post'

// This document's _data: meta (non-translatable) + en base + per-language overrides.
// Both the page and the index list read it.
export const data: {{TAB_PASCAL}}Data = { meta, en, overrides: { {{POST_OVERRIDES}} } }
