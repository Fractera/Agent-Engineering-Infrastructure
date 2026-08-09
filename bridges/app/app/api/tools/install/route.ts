import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { isToolId } from "@/lib/tools-registry";
import { installTool, toolState } from "@/lib/tools-install";

// Установка инструмента в продуктовый слой (шаг 501, 2026-08-09).
//
// Идентификатор проверяется по реестру, а путь на диске собирается ИЗ РЕЕСТРА, а
// не из того, что пришло. Поэтому произвольная строка здесь не адрес, а
// несуществующий инструмент.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string" || !isToolId(body.id)) {
    return NextResponse.json({ error: "unknown_tool" }, { status: 400 });
  }

  const res = installTool(body.id);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 500 });

  return NextResponse.json({ ok: true, ...res, state: toolState(body.id) });
}
