import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";

// ЗНАЧОК СОЦСЕТИ — СКАЧАТЬ ОДИН РАЗ И ПОЛОЖИТЬ В ПРОЕКТ (шаг 523).
//
// 🔒 ССЫЛКА НА ЧУЖОЙ CDN ЗАПРЕЩЕНА. Соблазн велик: `cdn.simpleicons.org/<слаг>`
// отдаёт готовый SVG, и его можно было бы просто вписать в `icon`. Тогда подвал
// КАЖДОГО посетителя ходил бы на чужой хост — а значит: страница ломается, когда
// хост недоступен; посетитель становится виден третьей стороне на каждой
// загрузке; и офлайн-режим (`offlineCache`) показывает дыры вместо значков.
// Поэтому скачиваем ЗДЕСЬ, ОДИН раз, и кладём в медиатеку проекта.
//
// 🔒 ИСТОЧНИК И ЛИЦЕНЗИЯ — ПРОВЕРЕНЫ ПО ПЕРВОИСТОЧНИКУ (правило 16), 2026-08-20:
//   • адрес одного значка — `https://cdn.simpleicons.org/[ICON SLUG]`, дословно
//     из README репозитория `simple-icons/simple-icons`;
//   • лицензия — `CC0 1.0 Universal` (файл `LICENSE.md` того же репозитория),
//     то есть отказ от прав в пользу общества: класть в проект можно;
//   • отдельно оговорена оговорка о товарных знаках (`DISCLAIMER.md`) — CC0 не
//     даёт прав на сам БРЕНД, и значок остаётся знаком его владельца. Для нашего
//     случая это ровно то, что нужно: владелец ставит значок сети, в которой у
//     него есть профиль.
//
// Дверь ничего не пишет в конфиг: она возвращает адрес положенного файла, а
// сохраняет запись владелец — тот же порядок, что у распознавания.

export const dynamic = "force-dynamic";

const DATA_URL = process.env.DATA_INTERNAL_URL ?? "http://127.0.0.1:3300";

/** Слаг simple-icons: строчные буквы, цифры, дефис, точка и плюс (`dot-net`, `c++` → `cplusplus`). */
const SLUG = /^[a-z0-9][a-z0-9.+-]{0,60}$/;

export async function POST(req: NextRequest) {
  const cookie = req.headers.get("cookie") ?? "";
  const ok = await requireAuth(cookie);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let slug = "";
  try {
    const body = (await req.json()) as { slug?: unknown };
    slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  // Слаг уходит в адрес чужого хоста — поэтому он проверяется формой, а не
  // экранированием: так в запрос не попадёт ни путь, ни хост, ни запрос.
  if (!SLUG.test(slug)) return NextResponse.json({ ok: false, reason: "bad-slug" });

  let svg: string;
  try {
    const r = await fetch(`https://cdn.simpleicons.org/${slug}`, {
      headers: { accept: "image/svg+xml" },
      signal: AbortSignal.timeout(10000),
    });
    // Нет такого слага — это ФАКТ, а не поломка: запись сохранится без значка,
    // и подвал нарисует общий знак. Ответ успешный, причина названа.
    if (!r.ok) return NextResponse.json({ ok: false, reason: r.status === 404 ? "no-icon" : "source", detail: String(r.status) });
    svg = await r.text();
  } catch (e) {
    return NextResponse.json({ ok: false, reason: "source", detail: String(e).slice(0, 200) });
  }

  // Отдали не SVG — значит отдали что угодно другое, и класть это в медиатеку нельзя.
  if (!svg.trimStart().startsWith("<svg") || svg.length > 200_000) {
    return NextResponse.json({ ok: false, reason: "not-svg" });
  }

  // Кладём в медиатеку ТОЙ ЖЕ дверью, что и картинки настроек, и с cookie
  // владельца: служба данных проверяет сессию, а не доверяет соседу по машине.
  try {
    const fd = new FormData();
    fd.append("file", new File([svg], `${slug}.svg`, { type: "image/svg+xml" }));
    fd.append("name", `${slug}.svg`);
    fd.append("title", `simple-icons: ${slug}`);
    const up = await fetch(`${DATA_URL}/media/upload`, {
      method: "POST",
      headers: { cookie },
      body: fd,
      signal: AbortSignal.timeout(20000),
    });
    const data = (await up.json()) as { ok?: boolean; error?: string; item?: { id?: string } };
    if (!data?.ok || !data.item?.id) {
      return NextResponse.json({ ok: false, reason: "store", detail: String(data?.error ?? up.status).slice(0, 200) });
    }
    // Адрес СЛОТ-ОТНОСИТЕЛЬНЫЙ: приложение отдаёт файл через свой прокси, поэтому
    // ссылка остаётся своей в обоих режимах — и по IP, и на домене.
    return NextResponse.json({ ok: true, url: `/api/media/${data.item.id}/file` });
  } catch (e) {
    return NextResponse.json({ ok: false, reason: "store", detail: String(e).slice(0, 200) });
  }
}
