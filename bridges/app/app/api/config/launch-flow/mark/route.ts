import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { isFlowMark, setFlowMark, flowMarked } from "@/lib/launch-flow";

// ОТМЕТКА, КОТОРУЮ СТАВИТ ЧЕЛОВЕК (28-23, 2026-08-27).
//
// 🔒 ЭТО ПРИЁМ ФАКТА, А НЕ ПРОВЕРКА, и разница здесь не формальная. Claude Code
// открыт на машине человека; панель работает на сервере, и канала, по которому
// такой вопрос можно задать, между ними нет. Сообщает тот, кто совершил.
//
// 🔒 ОТМЕТКА СНИМАЕМАЯ — дверь принимает `done: false`. Одноразовая отметка
// говорила бы «когда-то стояло»: подписка кончается, программу сносят. Тот же
// закон, что у отметок инструментов разработки.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req.headers.get("cookie") ?? ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { mark?: unknown; done?: unknown }
    | null;

  if (!isFlowMark(body?.mark)) {
    return NextResponse.json({ ok: false, error: "unknown-mark" }, { status: 400 });
  }
  if (typeof body?.done !== "boolean") {
    return NextResponse.json({ ok: false, error: "bad-done" }, { status: 400 });
  }

  setFlowMark(body.mark, body.done);

  return NextResponse.json({ ok: true, mark: body.mark, done: flowMarked(body.mark) });
}
