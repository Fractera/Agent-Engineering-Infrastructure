// РАЗВОЗКА ПО НАСТУПЛЕНИЮ — серверный двойник браузерного сторожа.
//
// ⚠ ЧЕСТНАЯ ПОПРАВКА К РАНЕЕ НАПИСАННОМУ. В инструкции `tab.calendar.md` §4 сначала было сказано, что
// серверный тик будет толкать автоматизацию в её дверь `api/run`. При постройке выяснилось, что это
// неверно: `api/run` исполняет ГРАФ автоматизации (вход → середина → выход), а развозка наступивших
// записей графом не является — это работа ВКЛАДКИ, такая же, как показ уведомления, только сделанная
// на сервере. Прогнать её через `api/run` значило бы запустить рабочий поток автоматизации там, где
// его никто не звал. Поэтому у развозки своя дверь (`api/calendar-tick`), и закон «у автоматизации одна
// точка запуска» не нарушен: исполнение графа по-прежнему живёт только в `api/run`.
//
// ПОЧЕМУ ВООБЩЕ НА СЕРВЕРЕ: закрытая вкладка не отправляет писем. Уведомление на экране вправе зависеть
// от того, смотрит ли кто-то на страницу; доставка наружу — нет.
//
// РОВНО ОДИН РАЗ. Тик может повториться (перезапуск процесса, наложение расписаний, ручной вызов), и
// повтор не имеет права отправить письмо второй раз. Отметка об отправке живёт В САМОЙ ЗАПИСИ —
// `integrations[канал].deliveredAt` — и ставится тем же append-only способом, что и любая правка строки.
// Отметка ставится ПОСЛЕ успешной отправки: упавшая отправка обязана повториться на следующем тике.
import { listRows, updateRow } from "../../rows";
import { sendEmail, sendTelegram, sendToAutomation } from "../../transport";
import { notifyAtMs, toCalRows, type CalRow, type RowIntegration } from "./index";

/** Дальше этого в прошлое не заглядываем: сервер, простоявший сутки, не рассылает залпом всё пропущенное. */
const BACKSTOP_MS = 24 * 60 * 60 * 1000;

export type DeliveryReport = {
  checked: number;
  due: number;
  sent: { row: string; channel: string; ref: string }[];
  failed: { row: string; channel: string; error: string }[];
  skipped: { row: string; channel: string; reason: string }[];
};

/** Момент отправки — ТОТ ЖЕ, что и момент уведомления (с учётом упреждения). Одно событие, одно время. */
function isDue(row: CalRow, nowMs: number): boolean {
  const at = notifyAtMs(row);
  return at !== null && at <= nowMs && at > nowMs - BACKSTOP_MS;
}

/** Текст, который уходит наружу, когда владелец не написал своего. */
const fallbackText = (row: CalRow): string => `${row.date} ${row.time} — ${row.title}`.trim();

// 🔔 ВВОДНАЯ СТРОКА НАПОМИНАНИЯ (308, требование владельца): пришедшее по времени напоминание НЕ приходит
// голым текстом — оно начинается со стандартной локализованной шапки «уведомление о напоминании,
// запланированном на <дата время>», и только потом сам текст. Язык — язык автоматизации
// (`NEXT_PUBLIC_DEFAULT_LOCALE`, тот же, что у кокпита; фолбэк en). Применяется к telegram-каналам —
// туда, где человек читает сообщение. Один компонент → работает и в v3, и в замороженном шаблоне.
const REMINDER_INTRO: Record<string, (when: string) => string> = {
  en: (w) => `🔔 Reminder notification, scheduled for ${w}:`,
  es: (w) => `🔔 Notificación de recordatorio, programada para ${w}:`,
  fr: (w) => `🔔 Notification de rappel, programmée pour le ${w} :`,
  it: (w) => `🔔 Notifica di promemoria, programmata per il ${w}:`,
  ru: (w) => `🔔 Уведомление о напоминании, запланированном на ${w}:`,
  de: (w) => `🔔 Erinnerungsbenachrichtigung, geplant für ${w}:`,
  pt: (w) => `🔔 Notificação de lembrete, agendada para ${w}:`,
  pl: (w) => `🔔 Powiadomienie o przypomnieniu, zaplanowanym na ${w}:`,
  tr: (w) => `🔔 Hatırlatma bildirimi, ${w} için planlandı:`,
  nl: (w) => `🔔 Herinneringsmelding, gepland voor ${w}:`,
};

/** Сообщение напоминания с локализованной шапкой: «🔔 …запланировано на <дата время>:» + текст. */
function withReminderIntro(row: CalRow, body: string): string {
  const lang = (process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en").toLowerCase().slice(0, 2);
  const intro = (REMINDER_INTRO[lang] ?? REMINDER_INTRO.en)(`${row.date} ${row.time}`.trim());
  return `${intro}\n\n${body}`;
}

export async function deliverDue(options: { table?: string; origin: string; gate?: string; now?: number }): Promise<DeliveryReport> {
  const table = options.table ?? "calendar";
  const nowMs = options.now ?? Date.now();
  const rows = toCalRows((await listRows(table, Infinity)) as unknown as Record<string, unknown>[]);
  const report: DeliveryReport = { checked: rows.length, due: 0, sent: [], failed: [], skipped: [] };

  for (const row of rows) {
    if (!isDue(row, nowMs)) continue;
    report.due++;

    for (const [channel, raw] of Object.entries(row.integrations ?? {})) {
      const value = raw as RowIntegration & { deliveredAt?: string };
      if (!value?.active) {
        report.skipped.push({ row: row.id, channel, reason: "not active on this entry" });
        continue;
      }
      if (value.deliveredAt) {
        report.skipped.push({ row: row.id, channel, reason: "already delivered" });
        continue;
      }

      try {
        const ref = await send(channel, value, row, options);
        // Отметка ставится ТОЛЬКО после успеха и сразу же: упавший процесс между отправкой и отметкой —
        // единственный случай, когда возможен повтор, и он предпочтительнее молчаливой потери.
        const next: Record<string, RowIntegration> = {
          ...row.integrations,
          [channel]: { ...value, deliveredAt: new Date(nowMs).toISOString() },
        };
        await updateRow(table, row.id, { integrations: next });
        row.integrations = next;
        report.sent.push({ row: row.id, channel, ref });
      } catch (e) {
        // Провал одного канала не отменяет остальные: у события три адресата, и молчание одного из них
        // не повод лишить сообщения двух других. Ошибка уходит в отчёт целиком.
        report.failed.push({ row: row.id, channel, error: e instanceof Error ? e.message : String(e) });
      }
    }
  }

  return report;
}

async function send(
  channel: string,
  value: RowIntegration,
  row: CalRow,
  options: { origin: string; gate?: string },
): Promise<string> {
  switch (channel) {
    case "telegram-bot":
      return sendTelegram(withReminderIntro(row, String(value.text ?? "").trim() || fallbackText(row)));
    case "user-telegram-chat": {
      // Доставка по наступлению в ЛИЧНЫЙ чат человека (шаг 307.6): тот же бот, другой адресат.
      // ЧАТ БЕРЁТСЯ ИЗ САМОЙ ЗАПИСИ (308, авто-захват): `deliverCalendar` положил в интеграцию
      // `chatId` из сообщения владельца — так напоминание доходит БЕЗ ручного ввода. Фолбэк —
      // env `TELEGRAM_USER_CHAT_ID` (если запись старая или запуск был не из чата). Ни там, ни там
      // нет → «канал не подключён» честной ошибкой (а не тихий провал).
      const chatId = String(value.chatId ?? "").trim() || (process.env.TELEGRAM_USER_CHAT_ID ?? "").trim();
      if (!chatId) throw new Error("no chat to remind — write to the bot once so it learns your chat, or set TELEGRAM_USER_CHAT_ID in Settings");
      return sendTelegram(withReminderIntro(row, String(value.text ?? "").trim() || fallbackText(row)), chatId);
    }
    case "email":
      return sendEmail(
        String(value.to ?? ""),
        String(value.subject ?? "").trim() || row.title,
        String(value.body ?? "").trim() || fallbackText(row),
      );
    case "external-automation":
      return sendToAutomation(
        options.origin,
        String(value.automationId ?? ""),
        String(value.event ?? "").trim() || "calendar-entry-due",
        value.data ?? fallbackText(row),
        options.gate,
      );
    default:
      // Незнакомый канал — не повод молча пропустить: он объявлен в ядре, значит кто-то его ждёт.
      throw new Error(`channel "${channel}" has no transport — declared in the core but not built`);
  }
}
