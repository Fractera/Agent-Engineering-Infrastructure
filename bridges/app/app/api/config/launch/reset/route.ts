import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { readLaunch, resetLaunch } from "@/lib/launch";

// «Начать сначала» (шаг 25, решение владельца 2026-08-26).
//
// 🔒 ЗАЧЕМ ЭТО ПРОДУКТУ, А НЕ ТОЛЬКО ПРИЁМКЕ. Экран выбора стоит перед человеком,
// который ещё ничего не знает о продукте, и промахнуться кнопкой там — норма.
// Мастер без выхода означал бы, что промах стоит всего пути.
//
// 🔒 `withGithub` — ОТДЕЛЬНОЕ РЕШЕНИЕ, А НЕ ЧАСТЬ СБРОСА. Обычный сброс
// возвращает к экрану выбора и не трогает связь: адрес и ключ вводили один раз, и
// терять их при каждом «начну заново» незачем. Стереть саму связь просят редко —
// и именно этим владелец проходит мастер как чистый пользователь.
//
// Ответ перечисляет СТЁРТЫЕ КЛЮЧИ поимённо: сброс — операция, которую нельзя
// отменить, и она обязана сказать, что именно унесла.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { withGithub?: unknown };
  const withGithub = body?.withGithub === true;

  try {
    // Адрес называется ДО стирания: без него связь не восстановить, а человек,
    // нажавший «стереть всё», обычно узнаёт об этом уже после.
    const before = readLaunch();
    const { cleared } = resetLaunch(withGithub);
    const after = readLaunch();
    return NextResponse.json({
      ok: true,
      cleared,
      previousRepoUrl: before.repoUrl || null,
      mode: after.mode,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
