// ФУНКЦИЯ УЗЛА «INPUT» (канал cron) — планировщик по расписанию толкает дверь запуска
// (`POST api/run { source: "cron" }`), и этот узел превращает тик в синтетическое сообщение.
//
// У тика может не быть собственного текста — тогда сообщением становится сам факт тика с его моментом:
// это честный захват («в 09:00 сработало расписание»), а не выдумка содержимого. Планировщику ничего
// не нужно знать о контракте — он лишь стучится; расписание объявляется в `cron.json` папки, когда
// владелец включает канал. Тик — это ВХОД-push; опроса здесь нет (закон 3).
// Имя `receiveCron` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { captured, channelOf } from "../message";

export function receiveCron(ctx: NodeCtx): NodeCtx {
  if (channelOf(ctx) !== "cron") return {};
  const text = String(ctx.text ?? ctx.message ?? "").trim() || `Scheduled tick at ${new Date().toISOString()}`;
  return { ...captured(ctx, "cron", text) };
}
