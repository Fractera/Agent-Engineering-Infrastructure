import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { readLaunch, writeStartMode } from "@/lib/launch";
import { isStartMode, type StartMode } from "@/lib/launch.shared";

// Выбор двери, за которой начинается работа (шаг 25).
//
// 🔒 ЭТО ЗАПИСЬ РЕШЕНИЯ, А НЕ ДЕЙСТВИЕ. Ни одна строка кода не переезжает от
// нажатия на кнопку выбора: «стартовый шаблон» ничего не устанавливает, «чужой
// проект» ничего не уничтожает. Уничтожение живёт за своей дверью и за своим
// подтверждением — здесь только имя пути, по которому человек пошёл.
//
// 🔒 ВЫБОР СНИМАЕМЫЙ. `mode: null` возвращает экран выбора. Дверь, из которой
// нельзя выйти, заставляет проходить чужой путь до конца, а ошибиться кнопкой на
// незнакомом экране — самое обычное дело.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const state = readLaunch();
  return NextResponse.json({ ok: true, mode: state.mode, current: state.current, total: state.total });
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { mode?: unknown } | null;
  const raw = body?.mode;
  if (raw !== null && !isStartMode(raw)) {
    return NextResponse.json({ error: "unknown_mode" }, { status: 400 });
  }

  try {
    writeStartMode(raw as StartMode | null);
    const state = readLaunch();
    return NextResponse.json({ ok: true, mode: state.mode, current: state.current, total: state.total });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
