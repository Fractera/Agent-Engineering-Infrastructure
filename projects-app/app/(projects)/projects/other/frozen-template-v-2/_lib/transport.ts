// ТРАНСПОРТ — как автоматизация физически отправляет наружу. ОДИН модуль на всех отправителей.
//
// ЗАЧЕМ ОТДЕЛЬНО ОТ УЗЛОВ. Отправить письмо хотят двое: выходной УЗЕЛ `deliverEmail` (по ходу прогона)
// и КАЛЕНДАРЬ (по наступлению записи). Если каждый напишет свой вызов Resend, у нас будет два места,
// где чинить просроченный ключ и два разных текста ошибки — прямое нарушение закона «ни одного двойного
// источника истины». Здесь лежит только транспорт: взять готовое сообщение и доставить. Что именно
// отправлять и кому — решает тот, кто зовёт.
//
// ВСЁ БРОСАЕТ. Транспорт, проглотивший отказ сервиса, врёт об успехе — и владелец узнает об этом через
// несколько дней по неполученному письму. Текст отказа сервиса передаётся наружу как есть: именно он
// объясняет и неподтверждённый домен, и просроченный ключ, и заблокированного бота.

/** ПИСЬМО через Resend. Ключи объявлены у канала `email` и вводятся формой ключей. */
export async function sendEmail(to: string, subject: string, text: string): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  // Отсутствие ключа — это «канал не подключён», а не «письмо не доставлено». Разные слова для разных
  // причин: первую чинит владелец в настройках, вторую — разбор ответа сервиса.
  if (!apiKey) throw new Error("RESEND_API_KEY is not set — connect the email channel in Settings first");
  if (!from) throw new Error("RESEND_FROM_EMAIL is not set — connect the email channel in Settings first");
  if (!to.trim()) throw new Error("no recipient address");

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [to.trim()], subject: subject.trim() || "(no subject)", text }),
  });
  const answer = (await r.json().catch(() => null)) as { id?: string; message?: string; name?: string } | null;
  if (!r.ok) throw new Error(`Resend refused the letter (HTTP ${r.status}): ${answer?.message ?? answer?.name ?? "no details"}`);
  if (!answer?.id) throw new Error("Resend accepted the request but returned no message id — treat that as a failure");
  return answer.id;
}

/** СООБЩЕНИЕ боту. Чат обязателен: без него отправлять некуда, и это не «необязательный ключ». */
export async function sendTelegram(text: string): Promise<string> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set — connect the Telegram channel in Settings first");
  // У ВХОДА пустой чат означает «принимать любой» — законное умолчание. У ВЫХОДА пустой чат означает,
  // что адресата нет вовсе. Один и тот же ключ, два разных смысла, и молчать о втором нельзя.
  if (!chatId) throw new Error("TELEGRAM_ALLOWED_CHAT_ID is empty — for sending it is the address, not an option");

  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const answer = (await r.json().catch(() => null)) as { ok?: boolean; result?: { message_id?: number }; description?: string } | null;
  if (!r.ok || !answer?.ok) throw new Error(`Telegram refused the message (HTTP ${r.status}): ${answer?.description ?? "no details"}`);
  return String(answer.result?.message_id ?? "");
}

/**
 * СОБЫТИЕ ДРУГОЙ АВТОМАТИЗАЦИИ — толчок в её дверь запуска, тем же путём, каким входит любой канал.
 * `origin` передаёт вызывающий: папка не имеет права знать ни порт, ни домен сервера (закон 0).
 * `gate` — секрет пропуска агента; без него в защищённом режиме дверь соседа ответит отказом.
 */
export async function sendToAutomation(
  origin: string,
  automationId: string,
  event: string,
  data: unknown,
  gate?: string,
): Promise<string> {
  const id = automationId.trim().replace(/^\/+|\/+$/g, "");
  if (!id) throw new Error("no automation id: nowhere to hand the event over");

  const r = await fetch(`${origin}/projects/${id}/api/run`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(gate ? { "x-fractera-agent-gate": gate } : {}) },
    body: JSON.stringify({ input: { source: "calendar", event, data } }),
  });
  if (!r.ok) throw new Error(`automation "${id}" refused the event (HTTP ${r.status})`);
  const answer = (await r.json().catch(() => null)) as { runId?: string } | null;
  return answer?.runId ?? "";
}
