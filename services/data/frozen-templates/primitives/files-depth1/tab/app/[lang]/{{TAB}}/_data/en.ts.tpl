import type { {{TAB_PASCAL}}Ui } from '../_lib/types'

// English UI strings (the base). Each extra <lang>.ts is a partial override that
// deep-merges over this, so a new language needs only its translated keys.
export const en: {{TAB_PASCAL}}Ui = {
  metaTitle: '{{LABEL}}',
  metaDescription:
    'The latest {{LABEL}} — every update in chronological order. Auto-discovered and statically rendered, fully readable with JavaScript off.',
  eyebrow: '{{LABEL}}',
  indexTitle: '{{LABEL}}',
  indexIntro:
    'Every current update, in chronological order. This is placeholder copy — replace it with your own.',
  breadcrumb: '{{LABEL}}',
  minRead: 'min read',
  tocHeading: 'In this article',
  faqHeading: 'Frequently asked questions',
  back: 'Back to all {{LABEL}}',
  titleSuffix: '{{LABEL}}',
}
