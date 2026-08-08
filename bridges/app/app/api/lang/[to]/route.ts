// Смена языка панели настоящим HTTP-редиректом (шаг 501).
//
// ПОЧЕМУ ОБРАБОТЧИК, А НЕ КЛИЕНТСКИЙ КОМПОНЕНТ. Переключателю нужно знать
// текущий адрес, чтобы увести на ту же страницу в другом языке. Прочитать его
// на сервере в layout нельзя: чтение заголовков делает ДИНАМИЧЕСКИМ всё
// поддерево, то есть стоило бы всей статики шага. Клиентский островок с
// usePathname стоил бы JS на каждой странице. Обработчик решает это бесплатно:
// ссылка — обычный <a>, путь берётся из Referer, ответ — 302. Работает при
// выключенном JS, страницы остаются статическими.
//
// Два режима:
//   /api/lang/ru   — явный выбор: запоминается в cookie
//   /api/lang/auto — определить язык брошенного к нам браузера (cookie →
//                    Accept-Language → английский). Это будущая точка входа
//                    после авторизации (фаза Ф3); cookie здесь НЕ ставится,
//                    иначе автоопределение навсегда закрепило бы случайный
//                    первый ответ браузера.
//
// Маршрут НЕ за гейтом архитектора: `proxy.ts` исключает `/api/*`. Это уместно —
// он не отдаёт ни байта данных, только вычисляет адрес. Сама страница, на
// которую он уводит, по-прежнему требует роль.

import { NextRequest, NextResponse } from "next/server";
import { isAdminLanguage, adminLanguages, DEFAULT_ADMIN_LANG } from "@/lib/i18n/admin-strings";

export const LANG_COOKIE = "FRACTERA_ADMIN_LANG";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

// Разбор Accept-Language с учётом веса: "ru-RU,ru;q=0.9,en;q=0.8" → ru, en.
// Берётся первый язык, который есть в словаре; региональный хвост отбрасывается
// ("pt-BR" → "pt"), потому что словарь панели ведётся по языкам, не по регионам.
function fromAcceptLanguage(header: string | null): string | null {
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

// Тот же путь, но в другом языке. Referer даёт полный адрес страницы, с которой
// нажали; первый сегмент — язык, его и подменяем. Referer могут отрезать —
// тогда честный откат на корень языка, а не выдуманный путь.
function samePathInLang(referer: string | null, lang: string, origin: string): string {
  if (!referer) return `${origin}/${lang}`;
  let url: URL;
  try {
    url = new URL(referer);
  } catch {
    return `${origin}/${lang}`;
  }
  if (url.origin !== origin) return `${origin}/${lang}`;

  const segments = url.pathname.split("/").filter(Boolean);
  // Со старой панели (`/`) уводим на корень нового языка: соответствующей
  // страницы там просто нет.
  if (segments.length === 0) return `${origin}/${lang}`;
  const rest = isAdminLanguage(segments[0]) ? segments.slice(1) : segments;
  return `${origin}/${[lang, ...rest].join("/")}${url.search}`;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ to: string }> }) {
  const { to } = await ctx.params;
  const origin = new URL(req.url).origin;
  const referer = req.headers.get("referer");

  if (to === "auto") {
    const cookie = req.cookies.get(LANG_COOKIE)?.value;
    const lang =
      (cookie && isAdminLanguage(cookie) && cookie) ||
      fromAcceptLanguage(req.headers.get("accept-language")) ||
      DEFAULT_ADMIN_LANG;
    return NextResponse.redirect(samePathInLang(referer, lang, origin), 302);
  }

  const lang = isAdminLanguage(to) ? to : DEFAULT_ADMIN_LANG;
  const res = NextResponse.redirect(samePathInLang(referer, lang, origin), 302);
  // Явный выбор человека сильнее его браузера — и обязан пережить перезагрузку.
  res.cookies.set(LANG_COOKIE, lang, {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: false,
  });
  return res;
}

// Отдаём список языков наружу для диагностики: без этого «поддерживаем ли мы
// автоопределение» проверяется только глазами.
export async function HEAD() {
  return new NextResponse(null, {
    status: 204,
    headers: { "x-admin-languages": adminLanguages().join(",") },
  });
}
