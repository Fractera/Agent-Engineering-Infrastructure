import type { {{TAB_PASCAL}}Override } from '../../_lib/types'

// Russian override. Scalar fields fall back to en per key; blocks/faq replace
// wholesale — so the in-body root anchor here points at the RU root (/ru).
export const ru: {{TAB_PASCAL}}Override = {
  title: '{{LABEL}}: заглушка #{{SAMPLE_INDEX}} — замените заголовок',
  seoTitle: '{{LABEL}}: заглушка #{{SAMPLE_INDEX}}',
  subtitle:
    'Lorem ipsum — это текст-заглушка. Замените его своим, сохранив структуру.',
  description:
    'Статья-заглушка. Уже несёт полный стандарт страницы — SEO, разметку, оглавление и FAQ; вам остаётся заменить только текст.',
  summary:
    'Статья-заглушка — замените текст, сохраните структуру.',
  blocks: [
    { kind: 'p', text: 'Lorem ipsum dolor sit amet. Замените это своим вступительным абзацем; см. [главную](/ru).' },
    { kind: 'h2', text: 'Первый раздел' },
    { kind: 'p', text: 'Ut enim ad minim veniam — текст-заглушка. Замените его своим содержанием, сохранив заголовки для оглавления.' },
    { kind: 'list', items: ['Первый тезис-заглушка', 'Второй тезис-заглушка', 'Третий тезис-заглушка'] },
    { kind: 'h2', text: 'Второй раздел' },
    { kind: 'p', text: 'Nemo enim ipsam — ещё один абзац-заглушка для демонстрации идеальной структуры статьи.' },
    { kind: 'quote', text: 'Короткая цитата-заглушка — замените реальной.' },
    { kind: 'founder', text: 'Заметка основателя — заглушка. Карточка автора рендерится автоматически.' },
  ],
  faq: [
    { q: 'Это настоящая статья?', a: 'Нет — это текст-заглушка. Замените своим.' },
    { q: 'Как добавить ещё одну?', a: 'Добавьте папку документа рядом с этой — список пересоберётся при сборке.' },
  ],
}
