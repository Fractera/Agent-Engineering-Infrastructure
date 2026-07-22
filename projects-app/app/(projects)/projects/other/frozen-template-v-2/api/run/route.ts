import { type NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { executeAutomation } from "../../_lib/executor";

// ДВЕРЬ ЗАПУСКА — единственная точка ИСПОЛНЕНИЯ автоматизации. Вход PUSH'ится сюда (закон 3: без polling).
//   POST api/run { query: "Apple" }        — короткая форма
//   POST api/run { input: { query: "Apple" } } — явная
// Возвращает outcome движка (ok, узлы, context) либо 409 с обучающим отказом (замороженный шаблон/нет
// видимых узлов). Исполняются только видимые узлы; первый throw узла останавливает цепочку.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const input = (body && typeof body.input === "object" && body.input !== null ? body.input : body) as Record<string, unknown>;

  const outcome = await executeAutomation(input);
  if ("refusal" in outcome) return NextResponse.json({ error: outcome.refusal }, { status: 409 });
  return NextResponse.json(outcome, { status: outcome.ok ? 200 : 422 });
}
