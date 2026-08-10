// Единый источник навигации панели управления (шаг 501).
//
// Этот список — ЕДИНСТВЕННОЕ место, где перечислены страницы админки. Из него
// получаются: пункты гамбургер-меню, тип ключей словаря (`AdminStrings.pages`)
// и, позже, карта прав. Добавить страницу = добавить строку здесь и папку
// `app/[lang]/<slug>/`; забыть перевод не получится — тип не соберётся.
//
// `slug` — машинная строка, НЕ переводится (правило 4г). Человеческие слова
// живут в словаре под тем же slug: `s.pages[slug].title` / `.hint`.

export const NAV_GROUPS = ["application", "data", "tools", "backup", "access", "project", "documents", "help"] as const;
export type NavGroup = (typeof NAV_GROUPS)[number];

// Порядок внутри группы = порядок в меню. Он повторяет порядок сегодняшнего
// ящика настроек, чтобы владелец узнавал панель, а не изучал её заново.
export const NAV = [
  // Карты групп — страницы-маршрутизаторы. Каждая стоит ПЕРВОЙ в своей группе:
  // человек, открывший категорию впервые, должен увидеть оглавление, а не
  // случайный раздел. На них же ведёт серединный сегмент хлебных крошек — без
  // них с уровня раздела некуда было вернуться.
  { slug: "map-application",  group: "application" },
  { slug: "app-settings",    group: "application" },
  { slug: "languages",       group: "application" },
  { slug: "parallel-routing", group: "application" },
  { slug: "app-features",    group: "application" },
  { slug: "top-menu",        group: "application" },
  { slug: "footer-pages",    group: "application" },
  { slug: "cookie-banner",   group: "application" },

  { slug: "map-data",         group: "data" },
  { slug: "users",           group: "data" },
  { slug: "media",           group: "data" },
  { slug: "database",        group: "data" },
  { slug: "vector-memory",   group: "data" },
  { slug: "agentic-rag",     group: "data" },
  { slug: "map",             group: "data" },

  // Микро-инструменты: маленькие переиспользуемые куски, которые панель
  // применяет для себя и отдаёт продуктовому слою. Заканчивается «Добавить
  // инструмент» — она переехала сюда из данных, где оказалась лишь потому, что
  // раздела инструментов не существовало.
  { slug: "tools",           group: "tools" },
  { slug: "tool-image-crop", group: "tools" },
  { slug: "tool-video-trim", group: "tools" },
  { slug: "tool-voice-input", group: "tools" },
  { slug: "tool-code-view",  group: "tools" },
  { slug: "add-tool",        group: "tools" },

  { slug: "map-backup",       group: "backup" },
  { slug: "export",          group: "backup" },
  { slug: "import",          group: "backup" },

  { slug: "map-access",       group: "access" },
  { slug: "domain",          group: "access" },
  { slug: "login-methods",   group: "access" },
  { slug: "channels",        group: "access" },
  { slug: "openai",          group: "access" },

  { slug: "map-project",      group: "project" },
  { slug: "github",          group: "project" },
  { slug: "github-about",    group: "project" },
  { slug: "deployments",     group: "project" },
  { slug: "env",             group: "project" },

  // Документы разработки — файлы в КОРНЕ СЛОТА, по которым работает агент в
  // приложении клиента. До этого слоя владелец мог прочитать свои же правила
  // только через терминал или локальный клон. Порядок — как их читает агент на
  // старте сессии: сначала главная инструкция, сразу за ней перечень того, что
  // платформа уже даёт (без него агент строит второе), потом остальное.
  // Страница-маршрутизатор группы: ЗАЧЕМ документов столько и как они связаны.
  // Стоит первой — человек, открывший группу впервые, видит сначала карту, а не
  // двенадцать одинаковых на вид пунктов.
  { slug: "doc-overview",         group: "documents" },
  { slug: "doc-instruction",      group: "documents" },
  { slug: "doc-use-cases",        group: "documents" },
  { slug: "doc-platform-tools",   group: "documents" },
  { slug: "doc-architecture",     group: "documents" },
  { slug: "doc-glossary",         group: "documents" },
  { slug: "doc-lessons",          group: "documents" },
  { slug: "doc-steps",            group: "documents" },
  { slug: "doc-antipatterns",     group: "documents" },
  { slug: "doc-design",           group: "documents" },
  { slug: "doc-code-samples",     group: "documents" },
  { slug: "doc-parallel-routing", group: "documents" },
  { slug: "doc-coding-standards", group: "documents" },
  { slug: "doc-troubleshooting",  group: "documents" },
  { slug: "doc-context-state",    group: "documents" },
  { slug: "doc-testing",          group: "documents" },
  { slug: "doc-single-agent",     group: "documents" },

  { slug: "map-help",         group: "help" },
  { slug: "how-to-build",    group: "help" },
  { slug: "help",            group: "help" },
] as const satisfies readonly { slug: string; group: NavGroup }[];

export type AdminPageSlug = (typeof NAV)[number]["slug"];

export const NAV_BY_GROUP: Record<NavGroup, readonly AdminPageSlug[]> = NAV_GROUPS.reduce(
  (acc, g) => {
    acc[g] = NAV.filter((n) => n.group === g).map((n) => n.slug);
    return acc;
  },
  {} as Record<NavGroup, AdminPageSlug[]>,
);

// Адрес страницы. Префикс языка ВИДИМЫЙ ВСЕГДА (решение владельца 2026-08-08):
// у панели нет SEO, ради которого FES прячет язык по умолчанию на голом корне,
// а предсказуемый адрес дороже короткого.
/**
 * Карта группы — куда ведёт её серединный сегмент в хлебных крошках.
 *
 * У двух групп карта уже была под своим именем: у документов это «Карта
 * документов», у инструментов — витрина. Переименовывать их ради единообразия
 * значило бы сломать адреса, которые уже существуют.
 */
export const GROUP_INDEX: Record<NavGroup, AdminPageSlug> = {
  application: "map-application",
  data: "map-data",
  tools: "tools",
  backup: "map-backup",
  access: "map-access",
  project: "map-project",
  documents: "doc-overview",
  help: "map-help",
};

export function adminHref(lang: string, slug?: AdminPageSlug): string {
  return slug ? `/${lang}/${slug}` : `/${lang}`;
}
