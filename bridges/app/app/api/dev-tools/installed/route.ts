import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { setInstalled, isDevTool, installedMap } from "@/lib/dev-tools-marks";

// Галочка «инструмент разработки поставлен» (владелец 2026-08-14).
//
// 🔒 ДВЕРЬ ДЛЯ ЧЕЛОВЕКА, а не только для агента. Отметку о браузере до сих пор
// умел ставить лишь агент (`./browser`), и владелец, поставивший расширение
// руками, не мог погасить предупреждение — он так и спросил: «где чекбокс?».
// Предупреждение, которое нельзя снять, перестают читать вместе со всеми
// соседними, поэтому эта дверь важнее, чем выглядит.
//
// Вся работа с файлом окружения живёт в `lib/dev-tools-marks.ts` — второй
// реализации у отметок быть не должно: они пишутся в тот же файл, что языки и
// GitHub, и разошедшиеся правки записи стоили бы этого файла целиком.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, installed: installedMap() });
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { tool?: unknown; installed?: unknown } | null;
  if (!isDevTool(body?.tool)) {
    return NextResponse.json({ error: "unknown_tool" }, { status: 400 });
  }
  if (typeof body?.installed !== "boolean") {
    return NextResponse.json({ error: "installed_required" }, { status: 400 });
  }

  try {
    setInstalled(body.tool, body.installed);
    return NextResponse.json({ ok: true, tool: body.tool, installed: body.installed });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
