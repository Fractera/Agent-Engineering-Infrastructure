import type { {{TAB_PASCAL}}Override } from '../../_lib/types'

// FROZEN ARCHETYPE TEMPLATE — content-collection placeholder post (RU override).
// Partial: scalar fields fall back to en per key; blocks/faq replace wholesale, so
// the in-body root anchor points at the RU root (/ru), per the i18n rule. Emitted
// only when 'ru' is in the configured language set.
export const ru: {{TAB_PASCAL}}Override = {
  title: '{{LABEL}}: заглушка #{{SAMPLE_INDEX}} — замените заголовок',
  seoTitle: '{{LABEL}}: заглушка #{{SAMPLE_INDEX}}',
  subtitle:
    'Lorem ipsum — это размороженная заглушка из замороженного архетипа «content-collection». Замените текст, сохраните структуру.',
  description:
    'Статья-заглушка, созданная замороженным архетипом content-collection. Наследует полный стандарт страницы — SEO, разметку, оглавление и FAQ; вам остаётся заменить только текст.',
  summary:
    'Статья-заглушка из замороженного архетипа content-collection — замените текст, сохраните структуру.',
  blocks: [
    { kind: 'p', text: 'Lorem ipsum dolor sit amet. Этот материал разморожен из замороженного архетипа силами [Agentic Engineering Infrastructure](/ru) — без генерации кода.' },
    { kind: 'h2', text: 'Первый раздел' },
    { kind: 'p', text: 'Ut enim ad minim veniam — текст-заглушка. Замените его своим содержанием, сохранив заголовки для оглавления.' },
    { kind: 'list', items: ['Первый тезис-заглушка', 'Второй тезис-заглушка', 'Третий тезис-заглушка'] },
    { kind: 'h2', text: 'Второй раздел' },
    { kind: 'p', text: 'Nemo enim ipsam — ещё один абзац-заглушка для демонстрации идеальной структуры статьи.' },
    { kind: 'quote', text: 'Короткая цитата-заглушка — замените реальной.' },
    { kind: 'founder', text: 'Заметка основателя — заглушка. Карточка автора рендерится автоматически.' },
  ],
  faq: [
    { q: 'Это настоящая статья?', a: 'Нет — это текст-заглушка из замороженного архетипа content-collection. Замените своим.' },
    { q: 'Как она создана?', a: 'Разморозкой замороженного архетипа: копирование файлов и подстановка токенов, без генерации кода ИИ.' },
    { q: 'Как добавить ещё одну?', a: 'Добавьте co-located папку поста (или разморозьте снова) — список пересоберётся через parser-fs.' },
  ],
}
