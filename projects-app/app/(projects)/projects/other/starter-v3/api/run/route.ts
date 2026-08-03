import { type NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { executeAutomation } from "../../_lib/executor";

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

  // АДРЕС САМОЙ АВТОМАТИЗАЦИИ (шаг 312.7) — дверь знает его точно: это её собственный путь без `/api/run`.
  // Отсюда речь берёт адрес кокпита и отвечает «зайди сюда», не выдумывая ссылку и не требуя второго
  // хранилища: хранить то, что и так известно из запроса, значит завести факту второй дом.
  const automationUrl = `${req.nextUrl.origin}${req.nextUrl.pathname.replace(/\/api\/run\/?$/, "")}`;

  const outcome = await executeAutomation({ ...input, automationUrl });
  if ("refusal" in outcome) return NextResponse.json({ error: outcome.refusal }, { status: 409 });

  // 🔒 ДВЕРЬ НЕ СОЧИНЯЕТ РЕЧЬ (шаг 312). Здесь стоял второй сборщик ответа: если прогон не принёс
  // `reply`, дверь звала `converse` сама. Это был второй дом одной работы — ответ собирался и тут, и
  // внутри Telegram-выхода. Теперь речь производит УЗЕЛ РЕЧИ внутри прогона, и `outcome.context.reply`
  // приходит из графа. Нет узла речи (он скрыт) — ответа нет, и это честно видно, а не подменяется.
  return NextResponse.json(outcome, { status: outcome.ok ? 200 : 422 });
}
