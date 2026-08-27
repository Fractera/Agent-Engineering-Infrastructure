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
};

const DICT: Record<string, ExampleStrings> = { en, ru };

export function exampleStrings(lang: string): ExampleStrings {
  return DICT[lang] ?? en;
}
