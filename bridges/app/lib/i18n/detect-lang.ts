// Определение языка панели по запросу браузера. ОДНА реализация на весь слой.
//
// ПОЧЕМУ ОТДЕЛЬНЫЙ МОДУЛЬ, А НЕ ФУНКЦИЯ ВНУТРИ МАРШРУТА. До переключения (Ф3)
// разбор `Accept-Language` жил внутри `app/api/lang/[to]/route.ts` — он был там
// единственным потребителем. С переключением потребителей стало два: тот же
// маршрут (`/api/lang/auto`) и корневая страница `/`, которая обязана увести
// человека на его язык. Второй разбор заголовка означал бы две правды о том,
// какой язык у посетителя: расходятся они молча и проявляются как «панель
// открылась не на том языке, на котором работает переключатель».
//
// ЗДЕСЬ НЕТ HTTP. Модуль принимает две строки и возвращает код языка — поэтому
// им одинаково пользуются обработчик маршрута (у него `NextRequest`) и серверный
// компонент страницы (у него `headers()`/`cookies()`), не приводя одно к другому.

import { isAdminLanguage, DEFAULT_ADMIN_LANG } from "@/lib/i18n/admin-strings";

// Имя cookie, в которой лежит ЯВНЫЙ выбор человека. Живёт здесь, а не в
// маршруте: читают её оба потребителя, а ставит — только маршрут явного выбора.
export const LANG_COOKIE = "FRACTERA_ADMIN_LANG";

// Разбор Accept-Language с учётом веса: "ru-RU,ru;q=0.9,en;q=0.8" → ru, en.
// Берётся первый язык, который есть в словаре; региональный хвост отбрасывается
// ("pt-BR" → "pt"), потому что словарь панели ведётся по языкам, не по регионам.
export function fromAcceptLanguage(header: string | null): string | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q.split("=")[1]) || 0 : 1 };
    })
    .filter((e) => e.tag)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    if (isAdminLanguage(tag)) return tag;
    const primary = tag.split("-")[0];
    if (isAdminLanguage(primary)) return primary;
  }
  return null;
}

// Язык посетителя: явный выбор → язык браузера → английский.
//
// Порядок не переставлять. Cookie сильнее заголовка потому, что это единственный
// след СОЗНАТЕЛЬНОГО решения человека, а `Accept-Language` — настройка системы,
// которую он чаще всего не выбирал. Английский в конце — не «язык по умолчанию
// для всех», а честный отказ: язык, которого нет в собранных, до страницы всё
// равно не доходит (`dynamicParams = false` даёт 404), поэтому подставить надо
// заведомо существующий.
export function detectAdminLang(cookieLang: string | undefined, acceptLanguage: string | null): string {
  if (cookieLang && isAdminLanguage(cookieLang)) return cookieLang;
  return fromAcceptLanguage(acceptLanguage) ?? DEFAULT_ADMIN_LANG;
}
