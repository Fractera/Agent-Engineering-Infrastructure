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
      return sendTelegram(String(value.text ?? "").trim() || fallbackText(row));
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
