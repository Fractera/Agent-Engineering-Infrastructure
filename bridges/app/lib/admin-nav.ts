// Единый источник навигации панели управления (шаг 501).
//
// Этот список — ЕДИНСТВЕННОЕ место, где перечислены страницы админки. Из него
// получаются: пункты гамбургер-меню, тип ключей словаря (`AdminStrings.pages`)
// и, позже, карта прав. Добавить страницу = добавить строку здесь и папку
// `app/[lang]/<slug>/`; забыть перевод не получится — тип не соберётся.
//
// `slug` — машинная строка, НЕ переводится (правило 4г). Человеческие слова
// живут в словаре под тем же slug: `s.pages[slug].title` / `.hint`.

export const NAV_GROUPS = ["application", "data", "access", "project", "help"] as const;
export type NavGroup = (typeof NAV_GROUPS)[number];

// Порядок внутри группы = порядок в меню. Он повторяет порядок сегодняшнего
// ящика настроек, чтобы владелец узнавал панель, а не изучал её заново.
export const NAV = [
  { slug: "app-settings",    group: "application" },
  { slug: "languages",       group: "application" },
  { slug: "parallel-routing", group: "application" },
  { slug: "app-features",    group: "application" },
  { slug: "top-menu",        group: "application" },
  { slug: "footer-pages",    group: "application" },
  { slug: "cookie-banner",   group: "application" },

  { slug: "users",           group: "data" },
  { slug: "media",           group: "data" },
  { slug: "database",        group: "data" },
  { slug: "vector-memory",   group: "data" },
  { slug: "agentic-rag",     group: "data" },
  { slug: "map",             group: "data" },
  // Завершает перечень инструментов (решение владельца 2026-08-08): после того,
  // как названы все склады и движки проекта, естественный следующий вопрос —
  // «а если нужен ещё один». Стоит здесь, а не в справке, потому что это
  // действие, а не пояснение.
  { slug: "add-tool",        group: "data" },
  { slug: "export",          group: "data" },
  { slug: "import",          group: "data" },

  { slug: "domain",          group: "access" },
  { slug: "login-methods",   group: "access" },
  { slug: "channels",        group: "access" },
  { slug: "openai",          group: "access" },

  { slug: "github",          group: "project" },
  { slug: "github-about",    group: "project" },
  { slug: "deployments",     group: "project" },
  { slug: "env",             group: "project" },

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
export function adminHref(lang: string, slug?: AdminPageSlug): string {
  return slug ? `/${lang}/${slug}` : `/${lang}`;
}
