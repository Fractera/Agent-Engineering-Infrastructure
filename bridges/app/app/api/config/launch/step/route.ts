import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { readLaunch, setLaunchStep } from "@/lib/launch";
import { isLaunchStepId } from "@/lib/launch.shared";

// Галочка «я прошёл этот шаг» (шаг 25).
//
// 🔒 ПРИЁМ ФАКТА, А НЕ ПРОВЕРКА — тот же закон, что у отметок инструментов
// разработки. Папка на ноутбуке, активированная подписка, файл, перетащенный в
// окно агента: канала, по которому панель могла бы это увидеть, не существует.
// Сообщает тот, кто совершил.
//
// 🔒 МАШИННЫЙ ШАГ ЭТОЙ ДВЕРЬЮ НЕ ЗАКРЫВАЕТСЯ. «Репозиторий отвечает» и «GitHub
// подтвердил ключ» проверяются у GitHub, и разрешить их галочкой значило бы
// пустить человека дальше по связи, которой нет: он поставит отметку из
// вежливости, а отправка откажет через три шага, и причина будет забыта.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const state = readLaunch();
  return NextResponse.json({
    ok: true,
    mode: state.mode,
    current: state.current,
    total: state.total,
    steps: state.steps.map(({ id, kind, done }) => ({ id, kind, done })),
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { step?: unknown; done?: unknown } | null;
  if (!isLaunchStepId(body?.step)) {
    return NextResponse.json({ error: "unknown_step" }, { status: 400 });
  }
  if (typeof body?.done !== "boolean") {
    return NextResponse.json({ error: "done_required" }, { status: 400 });
  }

  const state = readLaunch();
  const step = state.steps.find((s) => s.id === body.step);
  if (!step) {
    // Шаг существует, но не в ЭТОЙ двери: «загрузить проект» есть у стартового
    // шаблона и отсутствует у подключения чужого. Отказ называет причину, а не
    // делает вид, что галочка поставлена.
    return NextResponse.json({ error: "step_not_in_current_mode", mode: state.mode }, { status: 409 });
  }
  if (step.kind !== "checked") {
    return NextResponse.json({ error: "step_is_machine_verified" }, { status: 409 });
  }

  try {
    setLaunchStep(step.id, body.done);
    const next = readLaunch();
    return NextResponse.json({ ok: true, step: step.id, done: body.done, current: next.current });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
