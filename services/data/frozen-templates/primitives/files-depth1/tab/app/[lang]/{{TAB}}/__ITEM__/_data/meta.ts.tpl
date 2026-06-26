import { AUTHOR } from '@/lib/author'
import type { {{TAB_PASCAL}}Meta } from '../../_lib/types'

// Non-translatable fields. heroImage/ogImage point at a placeholder — replace with a
// real image; it is exposed automatically as the social-share snippet.
export const meta: {{TAB_PASCAL}}Meta = {
  slug: '{{SAMPLE_SLUG}}',
  date: '{{SAMPLE_DATE}}',
  readingMinutes: 4,
  tags: ['{{LABEL}}', 'Placeholder'],
  author: { name: AUTHOR.name, role: AUTHOR.role },
  heroImage: '/placeholders/content-collection.svg',
  ogImage: '/placeholders/content-collection.svg',
}
