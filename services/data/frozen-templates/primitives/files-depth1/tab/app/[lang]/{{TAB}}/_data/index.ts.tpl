{{LANG_IMPORTS}}
import { deepMerge } from '@/lib/utils/deep-merge'
import type { {{TAB_PASCAL}}Ui } from '../_lib/types'

// FROZEN ARCHETYPE TEMPLATE — content-collection. Public API of the tab's UI
// chrome: per-language strings deep-merged over the en base (EN fallback per key),
// so a new language is a file carrying only its translated label. The emitter
// regenerates {{LANG_IMPORTS}} / {{LANG_MAP}} from the configured language set.
const UI: Record<string, Partial<{{TAB_PASCAL}}Ui>> = { {{LANG_MAP}} }

export function get{{TAB_PASCAL}}Ui(lang: string): {{TAB_PASCAL}}Ui {
  return deepMerge<{{TAB_PASCAL}}Ui>(en, UI[lang])
}
