import { meta } from './meta'
import { en } from './en'
{{POST_OVERRIDE_IMPORTS}}
import type { {{TAB_PASCAL}}Data } from '../../_lib/post'

// CONSTRUCTOR PRIMITIVE files-depth1 placeholder document _data. meta
// (non-translatable) + en base + per-language overrides. The document is the single
// source of truth; _components and the index list both read it. The composer fills
// the override imports and the overrides map from the configured languages.
export const data: {{TAB_PASCAL}}Data = { meta, en, overrides: { {{POST_OVERRIDES}} } }
