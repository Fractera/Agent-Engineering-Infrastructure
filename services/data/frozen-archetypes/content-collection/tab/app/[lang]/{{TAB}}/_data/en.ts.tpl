import type { {{TAB_PASCAL}}Ui } from '../_lib/types'

// FROZEN ARCHETYPE TEMPLATE — content-collection. English UI chrome (the required
// base). One file per language; each extra <lang>.ts is a PARTIAL override that
// deep-merges over this base (getX Ui), so a new language needs only its
// translated label. {{LABEL}} is the per-language display name set at thaw time.
export const en: {{TAB_PASCAL}}Ui = {
  metaTitle: '{{LABEL}}',
  metaDescription:
    'The latest {{LABEL}} — every update in chronological order. Auto-discovered and statically rendered, fully readable with JavaScript off.',
  eyebrow: '{{LABEL}}',
  indexTitle: '{{LABEL}}',
  indexIntro:
    'Every current update, in chronological order. This is placeholder copy from the frozen content-collection archetype — replace it with your own.',
  breadcrumb: '{{LABEL}}',
  minRead: 'min read',
  tocHeading: 'In this article',
  faqHeading: 'Frequently asked questions',
  back: 'Back to all {{LABEL}}',
  titleSuffix: '{{LABEL}}',
}
