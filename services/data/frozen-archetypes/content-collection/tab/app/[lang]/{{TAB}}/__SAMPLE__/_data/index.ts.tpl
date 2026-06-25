import { meta } from './meta'
import { en } from './en'
{{POST_OVERRIDE_IMPORTS}}
import type { {{TAB_PASCAL}}Data } from '../../_lib/post'

// FROZEN ARCHETYPE TEMPLATE — content-collection placeholder post _data. meta
// (non-translatable) + en base + per-language overrides. The post is the single
// source of truth; _components and the index list both read it. The emitter fills
// {{POST_OVERRIDE_IMPORTS}} / {{POST_OVERRIDES}} from the configured languages.
export const data: {{TAB_PASCAL}}Data = { meta, en, overrides: { {{POST_OVERRIDES}} } }
