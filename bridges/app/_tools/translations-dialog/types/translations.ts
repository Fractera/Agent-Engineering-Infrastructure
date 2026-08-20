// Контракт инструмента «диалог переводов» (шаг 529).
//
// 🔒 ЗЕРКАЛО. Такой же инструмент лежит на стороне приложения —
// `fractera-next-starter/_tools/translations-dialog/`. Копия намеренная и
// объяснена в реестре (`lib/tools-registry.ts`): панель применяет инструмент в
// СВОИХ формах и живёт вне репозитория пользователя, а приложение обязано
// работать с выключенной панелью. Одна общая копия убила бы одно из двух.
//
// Что расходится у двух копий, и почему это не одно и то же:
//   • окно: здесь shadcn `Dialog` панели, там общий `AppDialog` приложения;
//   • языки: здесь приходят ПРОПСОМ (набор слота читает сервер панели), там
//     берутся из `translations.config` самого приложения;
//   • дверь перевода: здесь `/api/config/nav/translate`, там `/api/i18n/translate`.
// Общее — поведение: карточка на язык, автоперевод, сохранение по одному языку.

/** Одно переводимое поле записи. */
export type TranslatableField = {
  key: string;
  label: string;
  value: string;
  multiline?: boolean;
};

/** Черновики: язык → поле → значение. Та же форма, что у ветки `i18n` конфига. */
export type Drafts = Record<string, Record<string, string>>;

/** Код отказа двери перевода — интерфейс показывает по нему свою подсказку. */
export type TranslateError = "no-key" | "bad-key" | "no-funds" | "rate-limit" | "upstream" | null;

/** Слова инструмента. Резолвятся на сервере: 82 языка в браузер не уезжают. */
export type TranslationsUi = {
  title: string;
  intro: string;
  translateTab: string;
  translateAllTabs: string;
  translating: string;
  saveOne: string;
  saving: string;
  saved: string;
  savedMark: string;
  close: string;
  hint: string;
  noKey: string;
  badKey: string;
  upstream: string;
  keyLink: string;
};
