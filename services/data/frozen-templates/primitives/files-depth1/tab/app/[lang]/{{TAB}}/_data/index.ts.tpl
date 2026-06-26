{{LANG_IMPORTS}}
import { deepMerge } from '@/lib/utils/deep-merge'
import type { {{TAB_PASCAL}}Ui } from '../_lib/types'

// get{{TAB_PASCAL}}Ui(lang): the per-language UI strings, deep-merged over the en
// base (so any missing key falls back to English).
const UI: Record<string, Partial<{{TAB_PASCAL}}Ui>> = { {{LANG_MAP}} }

export function get{{TAB_PASCAL}}Ui(lang: string): {{TAB_PASCAL}}Ui {
  return deepMerge<{{TAB_PASCAL}}Ui>(en, UI[lang])
}
