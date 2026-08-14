import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { setInstalled } from "@/lib/dev-tools-marks";

// Отметка «браузер у агента доступен» (владелец 2026-08-13).
//
// 🔒 ЭТО ДВЕРЬ ДЛЯ АГЕНТА. Панель работает на сервере, а расширение живёт в
// браузере разработчика — между ними нет канала, по которому такой вопрос можно
// задать. Поэтому здесь не проверка, а ПРИЁМ факта от того, у кого расширение
// под рукой.
//
// 🔒 ОТМЕТКА ПЕРЕСТАВЛЯЕМАЯ, А НЕ ОДНОРАЗОВАЯ. Агент присылает своё состояние В
// КАЖДОЙ сессии: нашёл — дата обновляется, не нашёл — строка снимается. Поэтому
// «зелено» означает «работало в последнюю сессию», и это правда.
//
// 🔒 ЧЕЛОВЕК СТАВИТ ТУ ЖЕ ОТМЕТКУ ГАЛОЧКОЙ — через `../installed` (владелец
// 2026-08-14: «где чекбокс?»). Дверей две, потому что приходят с разных сторон,
// но запись одна и живёт в `lib/dev-tools-marks.ts`: две реализации записи в
// общий файл окружения однажды затёрли бы друг друга.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { connected?: boolean } | null;
  if (typeof body?.connected !== "boolean") {
    return NextResponse.json({ error: "connected_required" }, { status: 400 });
  }

  try {
    setInstalled("browser", body.connected);
    return NextResponse.json({ ok: true, connected: body.connected });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
