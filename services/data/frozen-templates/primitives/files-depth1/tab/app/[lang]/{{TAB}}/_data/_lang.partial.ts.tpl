import type { {{TAB_PASCAL}}Ui } from '../_lib/types'

// FROZEN ARCHETYPE TEMPLATE — content-collection. Per-language PARTIAL override of
// the tab UI chrome. The emitter instantiates one of these as <lang>.ts for every
// configured non-base language, substituting {{LANG}} (the export name) and
// {{LABEL}} (that language's translated label). Only the label-derived keys are
// set; every other key inherits the en base via deep-merge (getX Ui). Translate
// the remaining strings later by adding keys here — no other file changes.
export const {{LANG}}: Partial<{{TAB_PASCAL}}Ui> = {
  metaTitle: '{{LABEL}}',
  eyebrow: '{{LABEL}}',
  indexTitle: '{{LABEL}}',
  breadcrumb: '{{LABEL}}',
  back: '{{LABEL}}',
  titleSuffix: '{{LABEL}}',
}
