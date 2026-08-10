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
//                    Accept-Language → английский); cookie здесь НЕ ставится,
//                    иначе автоопределение навсегда закрепило бы случайный
//                    первый ответ браузера.
//
// САМО ОПРЕДЕЛЕНИЕ ЯЗЫКА ЖИВЁТ НЕ ЗДЕСЬ, а в `lib/i18n/detect-lang.ts`. С
// переключением (Ф3) у него появился второй потребитель — корневая страница `/`,
// и разбор `Accept-Language` обязан остаться в одном экземпляре: две копии
// расходятся молча и дают «панель открылась не на том языке, на котором работает
// переключатель».
//
// Маршрут НЕ за гейтом архитектора: `proxy.ts` исключает `/api/*`. Это уместно —
// он не отдаёт ни байта данных, только вычисляет адрес. Сама страница, на
// которую он уводит, по-прежнему требует роль.

import { NextRequest, NextResponse } from "next/server";
import { isAdminLanguage, adminLanguages, DEFAULT_ADMIN_LANG } from "@/lib/i18n/admin-strings";
import { LANG_COOKIE, detectAdminLang } from "@/lib/i18n/detect-lang";

const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

// Тот же путь, но в другом языке — ОТНОСИТЕЛЬНЫМ адресом.
//
// 🔴 ЗДЕСЬ БЫЛ БАГ (2026-08-08). Раньше функция собирала абсолютный адрес из
// `new URL(req.url).origin` — из того, каким запрос видит СЕРВЕР. Панель всегда
// стоит за nginx, и там это `127.0.0.1:3002`; схему Next подставлял из
// `x-forwarded-proto`, а хост оставлял внутренний, и получалась химера
// `https://localhost:3002/en`. Хуже: проверка «Referer того же origin»
// сравнивала настоящий `https://admin.aifa.dev` с этой химерой, не совпадало —
// и путь молча отбрасывался, так что человек попадал на корень языка вместо
// своей страницы.
//
// Лечение — не угадывать хост, а не иметь с ним дела: HTTP разрешает
// относительный `Location`, браузер разрешает его относительно адреса, по
// которому пришёл. Код становится верным в любом режиме (IP, домен, HTTPS) без
// единой ветки. Из `Referer` берётся ТОЛЬКО путь, его origin не используется
// никогда — поэтому подделать чужой хост через этот заголовок невозможно, а
// мусор в пути превращается в наш же 404, а не в переход на чужой сайт.
function samePathInLang(referer: string | null, lang: string): string {
  if (!referer) return `/${lang}`;
  let pathname = "";
  let search = "";
  try {
    const url = new URL(referer);
    pathname = url.pathname;
    search = url.search;
  } catch {
    return `/${lang}`;
  }

  const segments = pathname.split("/").filter(Boolean);
  // Пришли с корня (`/`) — уводим на корень языка: раздела в пути нет, сохранять
  // нечего.
  if (segments.length === 0) return `/${lang}`;
  const rest = isAdminLanguage(segments[0]) ? segments.slice(1) : segments;
  return `/${[lang, ...rest].join("/")}${search}`;
}

// Относительный редирект. `NextResponse.redirect` требует абсолютный адрес, а он
// нам как раз и не нужен — поэтому ответ собирается вручную.
function redirectTo(path: string): NextResponse {
  return new NextResponse(null, { status: 302, headers: { Location: path } });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ to: string }> }) {
  const { to } = await ctx.params;
  const referer = req.headers.get("referer");

  if (to === "auto") {
    const lang = detectAdminLang(
      req.cookies.get(LANG_COOKIE)?.value,
      req.headers.get("accept-language"),
    );
    return redirectTo(samePathInLang(referer, lang));
  }

  const lang = isAdminLanguage(to) ? to : DEFAULT_ADMIN_LANG;
  const res = redirectTo(samePathInLang(referer, lang));
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
