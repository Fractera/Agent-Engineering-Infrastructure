// ФУНКЦИЯ УЗЛА «OUTPUT» (канал map) — ставит метку на карту автоматизации: строка таблицы `map`
// с координатами и заголовком сообщения. Карту рисует вкладка (`_components/map/public`, гео-сервис
// за дверью `api/geo`) — узел лишь доставляет данные метки.
//
// КООРДИНАТЫ НЕСУТ НЕ ВСЕ КАНАЛЫ. Сообщение без `lat`/`lng` доставляется ЧЕСТНО ДЕГРАДИРОВАННО:
// пропуск с причиной в контексте, никакой выдуманной точки (закон брифа §6/§10 — деградируй честно,
// не подделывай результат).
//
// САМО-ГЕЙТ (308.0/308.4): в v3 метку ставим ТОЛЬКО когда `place` в `ctx.intent` — иначе координаты
// сообщения (например к фото места) не должны сами собой плодить метки чужих намерений. Без
// классификатора (`ctx.intent` не задан, простой стартер) — работает как раньше. Имя места (`placeTitle`,
// venue из шаринга) кладётся в строку. Имя `deliverMap` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { messageOf, servesIntent } from "../message";
import { addRow } from "../rows";

export async function deliverMap(ctx: NodeCtx): Promise<{ mapDelivery: string }> {
  if (!servesIntent(ctx, "place")) return { mapDelivery: "skipped: not a place intent" };
  const m = messageOf(ctx);
  if (m.lat === undefined || m.lng === undefined) {
    return { mapDelivery: "skipped: the message carries no lat/lng — this channel captured no coordinates" };
  }
  const row = await addRow("map", { date: m.at, title: m.placeTitle || m.title, place: m.placeTitle ?? "", source: m.source, lat: m.lat, lng: m.lng });
  return { mapDelivery: `marker ${row.id} at ${m.lat},${m.lng}` };
}
