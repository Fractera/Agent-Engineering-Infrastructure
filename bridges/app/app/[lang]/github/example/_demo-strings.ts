// СЛОВА СТРАНИЦЫ-ОБРАЗЦА (шаг 28-1, 2026-08-27).
//
// 🔒 ПОЧЕМУ НЕ В СЛОВАРЕ ПАНЕЛИ. `lib/i18n/admin-translations.json` уезжает в 82
// языка. Фейковые надписи образца пришлось бы переводить восемьдесят раз, а
// потом вычищать — образец временная поверхность, его слова умирают вместе с
// ним. Второй довод тот же, что у закона про дубли ключей: чем меньше в общем
// словаре временного, тем меньше шансов, что второе значение молча съест первое.
//
// 🔒 `en` + `ru` ОБЯЗАТЕЛЬНЫ, ИНЛАЙН-ТЕРНАР ЗАПРЕЩЁН. Даже здесь: `lang === 'ru'
// ? … : …` в разметке — это словарь, размазанный по файлу, и он всегда
// расходится. Здесь два объекта одной формы, и TypeScript следит за формой.
//
// 🔒 НЕИЗВЕСТНЫЙ ЯЗЫК ДЕГРАДИРУЕТ ДО АНГЛИЙСКОГО, А НЕ ПАДАЕТ. У панели включены
// `en` и `ru`; появится третий — образец покажет английский, а не пустоту.

export type ExampleStrings = {
  /** Хвост крошек — имя этой страницы в пути. */
  crumb: string;
  /** Метка над заголовком: чем эта страница является. */
  eyebrow: string;
  /** Заголовок первого уровня — тот самый, ради которого заведён подшаг. */
  title: string;
  /** Подзаголовок: путь человека одной фразой. */
  subtitle: string;
  /** Честная строка о том, что это образец, а не рабочая вкладка. */
  disclaimerTitle: string;
  disclaimerBody: string;

  /** Два больших контейнера выбора пути (28-2). */
  path: {
    starterBadge: string;
    starterTitle: string;
    starterLead: string;
    starterBullets: string[];
    starterMoreLabel: string;
    starterMore: string;
    starterCta: string;

    adoptBadge: string;
    adoptTitle: string;
    adoptLead: string;
    adoptBullets: string[];
    adoptMoreLabel: string;
    adoptMore: string;
    adoptCta: string;

    picked: string;
    reset: string;
  };
};

const en: ExampleStrings = {
  crumb: "example",
  eyebrow: "Launch wizard · section standard",
  title: "Launch the project",
  subtitle:
    "From an empty repository to the first change seen at your own address.",
  disclaimerTitle: "This page is a sample, not the wizard.",
  disclaimerBody:
    "The words and numbers here are fake and nothing is written to the server. It exists so the section standard can be looked at before it replaces the live tab.",

  path: {
    starterBadge: "Path one",
    starterTitle: "Start from the starter template",
    starterLead:
      "You get a working project from the first minute: pages, data layer, authorisation and the panel are already wired together.",
    starterBullets: [
      "A repository of your own, created from the template",
      "The site live at your address before you write a line of code",
      "Thirteen steps, one at a time — never four demands at once",
    ],
    starterMoreLabel: "What this means for my code",
    starterMore:
      "The template is the shape the platform expects. You edit pages and logic; the doors between layers stay where they are, so an update never collides with your work.",
    starterCta: "Start from the template",

    adoptBadge: "Path two",
    adoptTitle: "Connect a repository with a Fractera project",
    adoptLead:
      "You already have a project built on Fractera. Point at it, and the slot takes it in place of the template.",
    adoptBullets: [
      "Your repository stays yours — nothing is copied anywhere",
      "The donor is checked BEFORE anything here is replaced",
      "Fourteen steps: the extra one is the check of what you pointed at",
    ],
    adoptMoreLabel: "What is checked before the swap",
    adoptMore:
      "The address must answer, the project must have the shape the slot expects, and the clone must succeed into a folder next door. Only then does the swap happen — never the other way round.",
    adoptCta: "Connect a repository",

    picked: "Chosen: {path}",
    reset: "choose again",
  },
};

const ru: ExampleStrings = {
  crumb: "example",
  eyebrow: "Мастер запуска · стандарт секции",
  title: "Запуск проекта",
  subtitle:
    "От пустого репозитория до первого изменения, увиденного на вашем собственном адресе.",
  disclaimerTitle: "Это страница-образец, а не мастер.",
  disclaimerBody:
    "Надписи и числа здесь фейковые, на сервер не пишется ничего. Она нужна, чтобы посмотреть стандарт секции до того, как он заменит живую вкладку.",

  path: {
    starterBadge: "Путь первый",
    starterTitle: "Запуск проекта со стартового шаблона",
    starterLead:
      "Работающий проект с первой минуты: страницы, слой данных, авторизация и панель уже связаны между собой.",
    starterBullets: [
      "Свой репозиторий, созданный из шаблона",
      "Сайт на вашем адресе раньше, чем вы напишете первую строку кода",
      "Тринадцать шагов по одному — никогда не четыре требования разом",
    ],
    starterMoreLabel: "Что это значит для моего кода",
    starterMore:
      "Шаблон — это форма, которую платформа ожидает. Вы правите страницы и логику; двери между слоями остаются на местах, поэтому обновление не сталкивается с вашей работой.",
    starterCta: "Начать со стартового шаблона",

    adoptBadge: "Путь второй",
    adoptTitle: "Подключение репозитория с проектом Fractera",
    adoptLead:
      "У вас уже есть проект на Fractera. Укажите его — и слот примет ваш проект вместо шаблона.",
    adoptBullets: [
      "Ваш репозиторий остаётся вашим — никуда ничего не копируется",
      "Донор проверяется ДО того, как здесь что-либо заменяется",
      "Четырнадцать шагов: лишний — проверка того, на что вы указали",
    ],
    adoptMoreLabel: "Что проверяется до замены",
    adoptMore:
      "Адрес обязан ответить, у проекта обязана быть форма, которую слот ожидает, и клон обязан лечь в соседнюю папку. Только тогда происходит замена — и никогда наоборот.",
    adoptCta: "Подключить репозиторий",

    picked: "Выбрано: {path}",
    reset: "выбрать заново",
  },
};

const DICT: Record<string, ExampleStrings> = { en, ru };

export function exampleStrings(lang: string): ExampleStrings {
  return DICT[lang] ?? en;
}
