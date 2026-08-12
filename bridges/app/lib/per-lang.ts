// Значение настройки НА ЯЗЫК (шаг 501, Ф2, партия 16).
//
// ЗАЧЕМ. Гость отдавал ОДНУ мету на все языки: при `NEXT_PUBLIC_SUPPORTED_LANGUAGES=en,es`
// испанская страница получала английский заголовок и описание. Для поиска это хуже
// отсутствия перевода — страница объявляет себя англоязычной, будучи испанской.
//
// ФОРМА ХРАНЕНИЯ — и почему именно такая. Поле остаётся ТЕМ ЖЕ ключом в
// `app-config.json`, а переводы живут рядом, в `i18n.<путь>.<язык>`:
//
//   { "name": "Fractera", "i18n": { "name": { "es": "Fractera ES" } } }
//
// Три причины, почему не «name: { en: …, es: … }»:
//   • старые конфиги продолжают читаться без миграции — значение лежит там же;
//   • код, который берёт `config.name` и не знает про языки, не ломается;
//   • язык по умолчанию не дублируется: он и есть само значение.
//
// ПРАВИЛО ЧТЕНИЯ: нет перевода — берётся основное значение. То же правило, что у
// словаря панели, и по той же причине: пустой перевод не должен гасить страницу.

export type I18nMap = Record<string, Record<string, string>>;

/** Значение поля для конкретного языка: перевод, иначе основное значение. */
export function valueForLang(
  base: unknown,
  i18n: I18nMap | undefined,
  path: string,
  lang: string,
): string {
  const translated = i18n?.[path]?.[lang];
  if (typeof translated === "string" && translated.trim() !== "") return translated;
  return typeof base === "string" ? base : "";
}

/** Есть ли перевод этого поля на этот язык — для подсветки в интерфейсе. */
export function hasTranslation(i18n: I18nMap | undefined, path: string, lang: string): boolean {
  const v = i18n?.[path]?.[lang];
  return typeof v === "string" && v.trim() !== "";
}

/**
 * Записать перевод. Пустая строка УДАЛЯЕТ перевод, а не хранит пустоту: пустой
 * перевод и отсутствие перевода — одно и то же состояние, и держать два его
 * представления значило бы плодить случаи, которые ведут себя одинаково.
 */
export function setTranslation(
  i18n: I18nMap | undefined,
  path: string,
  lang: string,
  value: string,
): I18nMap {
  const next: I18nMap = { ...(i18n ?? {}) };
  const forPath = { ...(next[path] ?? {}) };
  if (value.trim() === "") delete forPath[lang];
  else forPath[lang] = value;
  if (Object.keys(forPath).length === 0) delete next[path];
  else next[path] = forPath;
  return next;
}
