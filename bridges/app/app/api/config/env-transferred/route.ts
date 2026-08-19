import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { setMark, hasMark, ENV_TRANSFERRED_KEY } from "@/lib/dev-tools-marks";

// Галочка «`.env.local` перенесён на локальную машину» (владелец 2026-08-19).
//
// 🔒 ЗАЧЕМ ОТМЕТКА, ЕСЛИ ЕСТЬ КНОПКА СКАЧИВАНИЯ. Скачивание — не перенос. Файл
// уходит в загрузки браузера, а работать он должен рядом с `package.json` клона;
// между этими двумя точками панель не видит ничего. Поэтому предупреждение гасит
// человек, а не факт нажатия, — тем же приёмом, что у языков, GitHub и
// инструментов разработки.
//
// Отметка СНИМАЕМАЯ: снял галочку — предупреждение честно вернулось.
//
// Запись идёт единственным писателем файла окружения (`lib/dev-tools-marks.ts`).
// Второй реализации у отметок быть не должно: они живут в одном файле с языками и
// GitHub, и разошедшиеся правки стоили бы этого файла целиком.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, transferred: hasMark(ENV_TRANSFERRED_KEY) });
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { transferred?: unknown } | null;
  if (typeof body?.transferred !== "boolean") {
    return NextResponse.json({ error: "transferred_required" }, { status: 400 });
  }

  try {
    setMark(ENV_TRANSFERRED_KEY, body.transferred);
    return NextResponse.json({ ok: true, transferred: body.transferred });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
