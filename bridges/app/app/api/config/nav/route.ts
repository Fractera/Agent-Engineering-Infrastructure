import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { readNav, writeNav } from "@/app/[lang]/top-menu/_lib/server";
import type { NavState } from "@/app/[lang]/top-menu/_lib/types";

// Сохранение верхнего меню гостевого приложения.
//
// Одно сохранение делает ДВЕ вещи, и вторая — не украшение:
//   1) пишет ветку `nav` в `APP-CONFIG/app-config.json`;
//   2) зовёт `/api/revalidate` приложения, который сбрасывает кэш
//      `[lang]`-макета — там и живёт меню.
//
// 🔒 БЕЗ ВТОРОГО ШАГА ИЗМЕНЕНИЕ ЖДЁТ ОКНА ISR (`revalidate = 600`), то есть до
// десяти минут. Владелец, нажавший «Сохранить» и не увидевший результата,
// считает, что сломано, — и правильно делает: настройка, применяющаяся когда-то
// потом, неотличима от непринятой.
//
// 🔒 ЭТО НЕ ДЕЛАЕТ СТРАНИЦЫ ДИНАМИЧЕСКИМИ. Сброс кэша лишь помечает готовую
// статику устаревшей; следующая загрузка перегенерирует её и снова отдаёт
// статикой. Пересборки и развёртывания не происходит.
//
// 🔒 АДРЕС — `localhost`, а не публичный домен: приложение живёт на этом же
// сервере соседним процессом, и обращение через домен уходило бы наружу и
// обратно через nginx без всякой пользы.
const APP_ORIGIN = process.env.APP_ORIGIN ?? "http://localhost:3000";

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ nav: readNav() });
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { nav?: NavState } | null;
  const nav = body?.nav;
  if (!nav || !Array.isArray(nav.top)) {
    return NextResponse.json({ error: "bad_payload" }, { status: 400 });
  }

  try {
    writeNav({
      top: nav.top,
      authSide: nav.authSide === "left" ? "left" : "right",
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  // Сброс кэша — best-effort: его отказ не имеет права уронить сохранение,
  // потому что настройка УЖЕ записана. Но и промолчать он не должен: результат
  // уезжает наверх, чтобы интерфейс мог честно сказать «сохранено, но появится
  // в течение десяти минут» вместо бодрого «готово».
  let revalidated = false;
  try {
    const r = await fetch(`${APP_ORIGIN}/api/revalidate`, {
      method: "POST",
      headers: { "x-agent-identity": "fractera-admin" },
      cache: "no-store",
    });
    revalidated = r.ok;
  } catch {
    revalidated = false;
  }

  return NextResponse.json({ ok: true, revalidated });
}
