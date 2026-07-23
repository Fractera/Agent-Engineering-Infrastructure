import { type NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { executeAutomation } from "../../_lib/executor";

// ДВЕРЬ ПРИЁМА ПИСЬМА — сюда провайдер ТОЛКАЕТ входящее письмо, и отсюда начинается прогон.
// Адрес двери регистрируется в панели провайдера: `<адрес автоматизации>/api/inbound-email`.
//
// 🔒 ЭТА ДВЕРЬ НАМЕРЕННО НЕ ИСПОЛЬЗУЕТ СЕССИОННЫЙ `authorize`, И ЭТО НЕ УПУЩЕНИЕ.
// Письмо приходит от почтового сервиса, у которого нет и не может быть cookie владельца: сессионная
// проверка здесь означала бы 403 на КАЖДОЕ письмо и молчаливую смерть канала. Единственная законная
// защита такой двери — ПОДПИСЬ вызова (`RESEND_INBOUND_SECRET`), и она ниже обязательна: секрет не
// задан — дверь закрыта, а не открыта настежь.
// Следующей модели: не «чинить» это, добавив сюда authorize. Сначала прочитать `kind.input.md`.
//
// ЗАКОН «ВХОД ТОЛЬКО PUSH» (шаг 263.1, раунды 16–18): ящик никто не опрашивает. Опрос сделал бы приём
// зависимым от таймера и рано или поздно задвоил бы письма.
export const runtime = "nodejs";

/** Постоянное по времени сравнение: обычное `===` на секретах подтекает по времени ответа. */
function sameSignature(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_INBOUND_SECRET;
  // Нет секрета — нет приёма. Открытая дверь без подписи означала бы, что запустить эту автоматизацию
  // может кто угодно, знающий её адрес.
  if (!secret) return NextResponse.json({ error: "inbound is not configured: RESEND_INBOUND_SECRET is not set" }, { status: 503 });

  const raw = await req.text();
  // Заголовок подписи и её схема принадлежат ПРОВАЙДЕРУ и проверяются владельцем в его панели
  // (правило 16: гипотеза о внешнем сервисе не становится кодом без подтверждения). Здесь — общий
  // случай: HMAC-SHA256 от сырого тела, hex, в одном из принятых заголовков.
  const given = (req.headers.get("svix-signature") ?? req.headers.get("resend-signature") ?? req.headers.get("x-signature") ?? "")
    .trim()
    .replace(/^sha256=/, "");
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  if (!given || !sameSignature(given, expected)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const payload = (() => {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  })();
  if (!payload) return NextResponse.json({ error: "body is not JSON" }, { status: 400 });

  // Конверт провайдера бывает вложенным (`{ type, data: {...} }`) — берём внутренность, если она есть.
  const letter = (payload.data && typeof payload.data === "object" ? payload.data : payload) as Record<string, unknown>;
  const from = letter.from ?? letter.sender ?? "";
  const input = {
    from: typeof from === "string" ? from : ((from as { email?: string })?.email ?? ""),
    subject: String(letter.subject ?? ""),
    text: String(letter.text ?? letter.html ?? ""),
  };

  const outcome = await executeAutomation(input);
  // Провайдеру важен только факт приёма: 200 = письмо принято и больше не повторяем. Провал самого
  // прогона — наша забота, он записан в журнал прогонов и виден в отчёте.
  if ("refusal" in outcome) return NextResponse.json({ accepted: false, refusal: outcome.refusal }, { status: 200 });
  return NextResponse.json({ accepted: true, ok: outcome.ok, runId: outcome.runId }, { status: 200 });
}
