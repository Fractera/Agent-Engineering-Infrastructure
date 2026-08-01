// ФУНКЦИЯ УЗЛА «OUTPUT» (канал map) — ставит метку на карту автоматизации: строка таблицы `map`
// с координатами и заголовком сообщения. Карту рисует вкладка (`_components/map/public`, гео-сервис
// за дверью `api/geo`) — узел лишь доставляет данные метки.
//
// КООРДИНАТЫ НЕСУТ НЕ ВСЕ КАНАЛЫ. Сообщение без `lat`/`lng` доставляется ЧЕСТНО ДЕГРАДИРОВАННО:
// пропуск с причиной в контексте, никакой выдуманной точки (закон брифа §6/§10 — деградируй честно,
// не подделывай результат).
//
// САМО-ГЕЙТ (311.6): метку ставим для классов, оставляющих запись — иначе координаты
// сообщения (например к фото места) не должны сами собой плодить метки чужих намерений. Без
// фронта (прямой вызов двери) — работает безусловно. Имя места (`placeTitle`,
// venue из шаринга) кладётся в строку. Имя `deliverMap` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { messageOf, servesAnyClass, storesSkipped, RECORDING_CLASSES } from "../message";
import { addRow } from "../rows";
import { crossLink } from "../components/links/cross-link";

export async function deliverMap(ctx: NodeCtx): Promise<{ mapDelivery: string; mapRowId?: string }> {
  // Метку ставим для тех же классов, что оставляют запись: место — грань записи, а не отдельный домен
  // (шаг 311.6; прежний гейт по доменному намерению `place` удалён вместе со старой системой).
  if (storesSkipped(ctx)) return { mapDelivery: "skipped: the middle found nothing to store" };
  if (!servesAnyClass(ctx, RECORDING_CLASSES)) return { mapDelivery: "skipped: this request class leaves no record" };
  // Середина уже создала и связала гео-строку сама (создание и связывание в одном месте, любой порядок
  // прибытия) — тогда выход не задваивает строку.
  if (ctx.skipMap) return { mapDelivery: "handled upstream (the marker was created and linked in the middle)" };
  const m = messageOf(ctx);
  if (m.lat === undefined || m.lng === undefined) {
    return { mapDelivery: "skipped: the message carries no lat/lng — this channel captured no coordinates" };
  }
  const row = await addRow("map", { date: m.at, title: m.placeTitle || m.title, place: m.placeTitle ?? "", source: m.source, lat: m.lat, lng: m.lng });
  await crossLink(ctx, "map", row.id); // связь всех-ко-всем (309)
  return { mapDelivery: `marker ${row.id} at ${m.lat},${m.lng}`, mapRowId: row.id };
}
