// ФУНКЦИЯ УЗЛА «OUTPUT» (канал calendar) — ставит захваченное сообщение событием в календарь
// автоматизации: строка таблицы `calendar` в форме, которую читает вкладка (поля v1 дословно —
// `_lib/components/calendar/index.ts`): date "YYYY-MM-DD", time "HH:MM", title, type, notifyBefore,
// integrations. Момент события = момент захвата (`at`) по местным часам сервера.
//
// Календарь ЧИТАЕТ строки вывода — здесь именно доставка записи, а не своё хранилище (закон вкладки).
// Имя `deliverCalendar` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { messageOf } from "../message";
import { addRow } from "../rows";

export async function deliverCalendar(ctx: NodeCtx): Promise<{ calendarRowId: string }> {
  const m = messageOf(ctx);
  const at = new Date(m.at);
  const when = Number.isFinite(at.getTime()) ? at : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const row = await addRow("calendar", {
    date: `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}`,
    time: `${pad(when.getHours())}:${pad(when.getMinutes())}`,
    title: m.title,
    type: "event",
    notifyBefore: 0,
    integrations: {},
    source: m.source,
  });
  return { calendarRowId: row.id };
}
