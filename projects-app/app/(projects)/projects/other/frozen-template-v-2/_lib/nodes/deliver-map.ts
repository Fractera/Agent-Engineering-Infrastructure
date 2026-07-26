// ФУНКЦИЯ УЗЛА «OUTPUT» (канал map) — ставит метку на карту автоматизации: строка таблицы `map`
// с координатами и заголовком сообщения. Карту рисует вкладка (`_components/map/public`, гео-сервис
// за дверью `api/geo`) — узел лишь доставляет данные метки.
//
// КООРДИНАТЫ НЕСУТ НЕ ВСЕ КАНАЛЫ. Сообщение без `lat`/`lng` доставляется ЧЕСТНО ДЕГРАДИРОВАННО:
// пропуск с причиной в контексте, никакой выдуманной точки (закон брифа §6/§10 — деградируй честно,
// не подделывай результат). Имя `deliverMap` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { messageOf } from "../message";
import { addRow } from "../rows";

export async function deliverMap(ctx: NodeCtx): Promise<{ mapDelivery: string }> {
  const m = messageOf(ctx);
  if (m.lat === undefined || m.lng === undefined) {
    return { mapDelivery: "skipped: the message carries no lat/lng — this channel captured no coordinates" };
  }
  const row = await addRow("map", { date: m.at, title: m.title, source: m.source, lat: m.lat, lng: m.lng });
  return { mapDelivery: `marker ${row.id} at ${m.lat},${m.lng}` };
}
