import { type NextRequest, NextResponse } from "next/server";
import WebSocket from "ws";
import { authorize } from "@/lib/nodes";

export const runtime = "nodejs";

// ЖИВЫЕ МОДЕЛИ ПРОВАЙДЕРА (шаг 298) — список моделей запрашивается у МОСТА платформы, а не хардкодится.
//
// ЗАЧЕМ. Хардкод моделей устаревает молча: список в коде расходится с тем, что провайдер реально даёт
// СЕГОДНЯ (правка владельца 2026-07-23 — «предоставляй реальную модель на текущий момент»). Правильное
// решение уже живёт в пульте разработки (`_shared/dev-console`, шаг 255.B1): он спрашивает мост
// платформы по WebSocket `{type:"get_models"}` → `{type:"models", models:[…]}`. Тот же источник здесь.
//
// БЕЗ КЛЮЧА. Мост отдаёт список из установленного CLI/подписки, ключ API для этого не нужен — поэтому
// прежний довод «живой список требует ключа, а выбрать надо до ключа» неверен, и хардкод не оправдан.
//
// САМОДОСТАТОЧНОСТЬ (закон 0). Это СОБСТВЕННАЯ дверь автоматизации, а не вызов чужого роута: она,
// как и двери каналов, говорит с localhost-мостом (внешний сервис), карту порт↔провайдер держит у себя.
const BRIDGE_PORT: Record<string, number> = {
  anthropic: 3200, // PROMPT-мост Claude
  openai: 3202, // PROMPT-мост Codex
};

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const provider = (req.nextUrl.searchParams.get("provider") ?? "anthropic").trim();
  const port = BRIDGE_PORT[provider];
  if (!port) return NextResponse.json({ error: `unknown provider "${provider}"` }, { status: 400 });

  try {
    const raw = await new Promise<any[]>((resolvePromise, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/`);
      const timer = setTimeout(() => { try { ws.close(); } catch { /* closed */ } reject(new Error("bridge timeout")); }, 8000);
      ws.on("open", () => ws.send(JSON.stringify({ type: "get_models" })));
      ws.on("message", (frame: Buffer) => {
        try {
          const msg = JSON.parse(frame.toString()) as { type?: string; models?: unknown };
          if (msg.type === "models") {
            clearTimeout(timer);
            try { ws.close(); } catch { /* closed */ }
            resolvePromise(Array.isArray(msg.models) ? msg.models : []);
          }
        } catch { /* пропускаем не-JSON кадры */ }
      });
      ws.on("error", (e: Error) => { clearTimeout(timer); reject(e); });
    });
    // Приводим к тому, что нужно выпадающему списку: id + человеческое имя. Мост зовёт его `name`.
    const models = raw
      .filter((m) => m && typeof m.id === "string")
      .map((m) => ({ id: String(m.id), label: String(m.name ?? m.id) }));
    return NextResponse.json({ ok: true, provider, models });
  } catch (e) {
    // Мост не ответил — НЕ подсовываем хардкод: пустой список честнее устаревшего. Форма покажет
    // выбранную модель как есть и подсказку, что список сейчас недоступен.
    return NextResponse.json({ ok: false, provider, models: [], error: `models unavailable: ${e}` }, { status: 502 });
  }
}
