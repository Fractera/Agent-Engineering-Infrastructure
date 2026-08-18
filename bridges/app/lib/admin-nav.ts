// Единый источник навигации панели управления (шаг 501).
//
// Этот список — ЕДИНСТВЕННОЕ место, где перечислены страницы админки. Из него
// получаются: пункты гамбургер-меню, тип ключей словаря (`AdminStrings.pages`)
// и, позже, карта прав. Добавить страницу = добавить строку здесь и папку
// `app/[lang]/<slug>/`; забыть перевод не получится — тип не соберётся.
//
// `slug` — машинная строка, НЕ переводится (правило 4г). Человеческие слова
// живут в словаре под тем же slug: `s.pages[slug].title` / `.hint`.

// 🔒 «СДЕЛАНО ЗА ВАС» СТОИТ ПЕРВОЙ (владелец 2026-08-14).
//
// Порядок здесь — не вкусовщина: первая группа РАСКРЫТА на входе (см.
// `defaultChecked` в шапке), то есть именно её человек видит, впервые открыв
// панель. Раньше первыми стояли настройки приложения — список работы, которую
// ещё предстоит сделать. Теперь первым идёт список того, что уже работает без
// него: до того, как просить о настройке, стоит показать полученную ценность.
export const NAV_GROUPS = ["visibility", "design", "application", "products", "data", "tools", "backup", "access", "project", "documents", "help"] as const;
export type NavGroup = (typeof NAV_GROUPS)[number];

// Порядок внутри группы = порядок в меню. Он повторяет порядок сегодняшнего
// ящика настроек, чтобы владелец узнавал панель, а не изучал её заново.
export const NAV = [
  // Карты групп — страницы-маршрутизаторы. Каждая стоит ПЕРВОЙ в своей группе:
  // человек, открывший категорию впервые, должен увидеть оглавление, а не
  // случайный раздел. На них же ведёт серединный сегмент хлебных крошек — без
  // них с уровня раздела некуда было вернуться.
  // ── ДИЗАЙН (слой оформления, 2026-08-15) ────────────────────────────────
  // Группа стоит ВТОРОЙ, сразу за «Сделано за вас»: оформление — первое, что
  // владелец захочет изменить, увидев полученный сайт. Страницы идут от опоры
  // к вершине: шрифты выбираются раньше шкалы, шкала раньше форм и цвета.
  { slug: "map-design",       group: "design" },
  { slug: "design-fonts",     group: "design" },
  { slug: "design-type",      group: "design" },
  { slug: "design-shape",     group: "design" },
  { slug: "design-colors",    group: "design" },

  { slug: "map-application",  group: "application" },
  { slug: "app-settings",    group: "application" },
  { slug: "languages",       group: "application" },
  { slug: "parallel-routing", group: "application" },
  { slug: "app-features",    group: "application" },
  { slug: "top-menu",        group: "application" },
  { slug: "footer-pages",    group: "application" },
  { slug: "cookie-banner",   group: "application" },

  // ── ПРОДУКТЫ (2026-08-18) ───────────────────────────────────────────────
  // Группа стоит сразу за «Приложением», и это перенос, а не изобретение:
  // механика продуктов и пользовательских кейсов жила ОДНОЙ страницей в группе
  // «Документы разработки», между двадцатью одним текстом. По виду меню она от
  // них не отличалась, хотя это не документ, а рабочая поверхность — та самая,
  // с которой начинается разработка продукта.
  //
  // Порядок внутри группы: карта → список продуктов. Страница отдельного
  // продукта в меню НЕ значится: у неё динамический адрес
  // (`/products/{id}`), и попадают на неё из списка, а не из навигации.
  { slug: "map-products",    group: "products" },
  { slug: "products",        group: "products" },

  // ОДНА ВКЛАДКА В СВОЕЙ ГРУППЕ — так и задумано (владелец 2026-08-13).
  //
  // Материал начинался зелёной врезкой на странице языков: человек приходил
  // выбирать языки и наталкивался на «самое дорогое уже построено». Врезка
  // выросла до пяти абзацев и пяти документов, и страница языков стала ей мала.
  //
  // Группа названа вопросом ПОКУПАТЕЛЯ, а не аббревиатурой: «SEO» через месяц
  // начнёт врать, потому что сюда лягут изображения и скорость загрузки — а они
  // не поисковая оптимизация, хотя решают ту же задачу.
  //
  // Цена переезда названа честно: врезка работала тем, что стояла НА ПУТИ, и её
  // не искали. Поэтому на странице языков осталась одна строка со ссылкой сюда —
  // встреча сохранена, а весь текст живёт там, где ему место.
  { slug: "visibility",      group: "visibility" },

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
  // 🔒 ИНСТРУМЕНТЫ РАЗРАБОТКИ — НЕ ТО ЖЕ, ЧТО ГРУППА «ИНСТРУМЕНТЫ» (владелец
  // 2026-08-13). Та группа — готовые куски, которые едут ВНУТРЬ продукта
  // (обрезка картинки, голосовой ввод). Здесь — то, чем проект СТРОЯТ: они
  // живут на машине разработчика и в продукт не попадают никогда. Смешать их
  // значит однажды предложить клиенту установить себе в сайт браузерное
  // расширение. Поэтому страница стоит в группе «Проект», рядом с GitHub и
  // развёртываниями — всем, что про разработку и доставку.
  { slug: "dev-tools",       group: "project" },

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
  // Сразу за главной инструкцией (решение владельца 2026-08-12): самая
  // последствная опция корпуса стоит там, где её увидят, а не там, где на неё
  // наткнутся случайно. Выключена по умолчанию и заперта до кейсов.
  { slug: "doc-dynamic-workflows", group: "documents" },
  { slug: "doc-use-cases",        group: "documents" },
  { slug: "doc-platform-tools",   group: "documents" },
  { slug: "doc-architecture",     group: "documents" },
  { slug: "doc-seo",              group: "documents" },
  { slug: "doc-aio",              group: "documents" },
  { slug: "doc-pwa",              group: "documents" },
  { slug: "doc-glossary",         group: "documents" },
  { slug: "doc-lessons",          group: "documents" },
  { slug: "doc-steps",            group: "documents" },
  { slug: "doc-antipatterns",     group: "documents" },
  { slug: "doc-design",           group: "documents" },
  // Рядом с дизайном намеренно: секции — это то, ЧЕМ дизайн выражается, и
  // читать их порознь бессмысленно.
  { slug: "doc-sections",         group: "documents" },
  { slug: "doc-parallel-routing", group: "documents" },
  { slug: "doc-coding-standards", group: "documents" },
  { slug: "doc-troubleshooting",  group: "documents" },
  { slug: "doc-context-state",    group: "documents" },
  { slug: "doc-testing",          group: "documents" },
  { slug: "doc-single-agent",     group: "documents" },
  { slug: "doc-dialogue-format",  group: "documents" },
  { slug: "doc-content-engine",   group: "documents" },
  { slug: "doc-passport",         group: "documents" },
  { slug: "doc-case-to-step",     group: "documents" },

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
export const GROUP_INDEX = {
  application: "map-application",
  products: "map-products",
  // Своей карты у группы нет и не нужно: в ней одна вкладка, и карта вела бы на
  // оглавление из одного пункта. Индекс группы — сама вкладка, как у инструментов.
  visibility: "visibility",
  data: "map-data",
  design: "map-design",
  tools: "tools",
  backup: "map-backup",
  access: "map-access",
  project: "map-project",
  documents: "doc-overview",
  help: "map-help",
} as const satisfies Record<NavGroup, AdminPageSlug>;

/**
 * Группы, чья карта — ОБЩАЯ страница `map-…` (компонент `GroupMap`). Только у
 * них есть вводная фраза в словаре: своя страница пишет своё вступление сама.
 *
 * Выводится из `GROUP_INDEX`, а не перечисляется руками. Появится новая карта
 * `map-…` — ключ станет обязательным сам, и сборка потребует слова; исчезнет
 * карта — требование снимется. Список, который надо помнить обновлять, здесь
 * прожил бы ровно до первой правки навигации.
 */
export type MappedGroup = {
  [G in NavGroup]: (typeof GROUP_INDEX)[G] extends `map-${string}` ? G : never;
}[NavGroup];

export function adminHref(lang: string, slug?: AdminPageSlug): string {
  return slug ? `/${lang}/${slug}` : `/${lang}`;
}
