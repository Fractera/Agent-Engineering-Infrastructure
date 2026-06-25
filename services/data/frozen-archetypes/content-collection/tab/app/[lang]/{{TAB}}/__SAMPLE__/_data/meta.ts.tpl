import { AUTHOR } from '@/lib/author'
import type { {{TAB_PASCAL}}Meta } from '../../_lib/types'

// FROZEN ARCHETYPE TEMPLATE — content-collection placeholder post. Non-translatable
// fields. heroImage/ogImage point at the shipped placeholder (replace with a real
// image later — the page automatically exposes it as the social snippet).
export const meta: {{TAB_PASCAL}}Meta = {
  slug: '{{SAMPLE_SLUG}}',
  date: '{{SAMPLE_DATE}}',
  readingMinutes: 4,
  tags: ['{{LABEL}}', 'Placeholder'],
  author: { name: AUTHOR.name, role: AUTHOR.role },
  heroImage: '/placeholders/content-collection.svg',
  ogImage: '/placeholders/content-collection.svg',
}
