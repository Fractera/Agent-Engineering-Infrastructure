import type { {{TAB_PASCAL}}Base } from '../../_lib/types'

// English base body. Placeholder copy showing the full shape: subtitle, H2/H3
// sections (feed the table of contents), quote, list, root anchor, founder note, FAQ.
// Replace the copy; keep the shape.
export const en: {{TAB_PASCAL}}Base = {
  title: '{{LABEL}} placeholder #{{SAMPLE_INDEX}} — replace this title',
  seoTitle: '{{LABEL}} placeholder #{{SAMPLE_INDEX}}',
  subtitle:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. This is placeholder copy — replace it with your own.',
  description:
    'A placeholder article. It already carries the full page standard — SEO, structured data, table of contents and FAQ — so you only replace the text.',
  summary:
    'Placeholder article — replace the copy, keep the structure.',
  keywords: '{{LABEL}}, placeholder',
  blocks: [
    { kind: 'p', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Replace this with your own opening paragraph; see the [home page](/en).' },
    { kind: 'h2', text: 'First section heading' },
    { kind: 'p', text: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.' },
    { kind: 'h3', text: 'A supporting sub-heading' },
    { kind: 'p', text: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error.' },
    { kind: 'list', items: ['First placeholder point', 'Second placeholder point', 'Third placeholder point'] },
    { kind: 'h2', text: 'Second section heading' },
    { kind: 'p', text: 'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.' },
    { kind: 'quote', text: 'A short placeholder pull-quote — swap it for a real one.' },
    { kind: 'founder', text: 'Founder placeholder note. Replace with a closing thought; the author card renders automatically.' },
  ],
  faq: [
    { q: 'Is this a real article?', a: 'No — it is placeholder copy. Replace it with your own.' },
    { q: 'How do I add another one?', a: 'Add a document folder next to this one; the list regenerates itself on build.' },
  ],
}
