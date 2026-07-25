import type { Entity } from "../../_data/automation.schema";
import type { Surface } from "../surface";
import MainMap from "./public/main-map";
import MapAiRequest from "./admin/ai-request";

// МАРШРУТИЗАТОР КАРТЫ — та же тройка index/public/admin, что у всех продуктовых поверхностей v2 (перенос
// v1 `entities/map`, шаг 298).
//
// Карта — ПРОДУКТОВАЯ ПОВЕРХНОСТЬ (есть заявка «строить вместе с ИИ»): вся её логика — тайлы OSM, пины,
// ящик города — живёт в `public/`, где агент читает и правит её по техзаданию. В `admin/` — только форма
// заявки. Публичная половина одинакова на витрине и в кокпите; в кокпите под ней добавляется заявка ИИ.
export default function Map({
  surface,
  entities,
  lang,
}: {
  surface: Surface;
  entities: Entity[];
  lang: string;
}) {
  return (
    <div data-entity="map" data-surface={surface} className="space-y-3">
      <MainMap lang={lang} />
      {surface === "admin" ? <MapAiRequest entities={entities} lang={lang} /> : null}
    </div>
  );
}
