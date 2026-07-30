import { type NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { executeAutomation } from "../../_lib/executor";
import { converse } from "../../_lib/nodes/converse";

// ДВЕРЬ ЗАПУСКА — единственная точка ИСПОЛНЕНИЯ автоматизации. Вход PUSH'ится сюда (закон 3: без polling).
//   POST api/run { text: "hello" }                       — короткая форма (канал по умолчанию — пульт)
//   POST api/run { input: { source: "webhook", text: "hello" } } — явная, с меткой канала
// Возвращает outcome движка (ok, узлы, context) либо 409 с обучающим отказом (замороженный шаблон/нет
// видимых узлов). Исполняются только видимые узлы; первый throw узла останавливает цепочку.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const input = (body && typeof body.input === "object" && body.input !== null ? body.input : body) as Record<string, unknown>;

  const outcome = await executeAutomation(input);
  if ("refusal" in outcome) return NextResponse.json({ error: outcome.refusal }, { status: 409 });

  // ОТВЕТ ТОМУ, КТО СПРОСИЛ (309, требование владельца). Разговорный слой (`converse`) свёрнут в Telegram-
  // выход, поэтому прогон из ПУЛЬТА/вебхука не получал связного ответа. Здесь, ПОСЛЕ прогона, достраиваем
  // `context.reply`, если его ещё нет (для Telegram он уже собран в выходе) — и пульт показывает его в
  // отчёте. Тот же разговорный слой на все каналы: спросил в пульте — ответ в пульте. Для пульта chatId
  // пуст → буфер/отправка converse не трогаются, только строится текст ответа.
  if (outcome.ok && !(outcome.context && typeof outcome.context.reply === "string" && outcome.context.reply)) {
    try {
      const built = await converse(outcome.context ?? {});
      const reply = String((built as Record<string, unknown>).reply ?? "").trim();
      if (reply) outcome.context = { ...(outcome.context ?? {}), reply };
    } catch { /* ответ не критичен для исхода прогона — молча пропускаем */ }
  }

  return NextResponse.json(outcome, { status: outcome.ok ? 200 : 422 });
}
