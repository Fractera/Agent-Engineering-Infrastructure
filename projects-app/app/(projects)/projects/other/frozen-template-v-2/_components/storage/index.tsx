import type { Entity } from "../../_data/automation.schema";
import type { Surface } from "../surface";
import MainStorage from "./public/main-storage";
import StorageAiRequest from "./admin/ai-request";

// МАРШРУТИЗАТОР СКЛАДА — та же тройка index/public/admin, что у всех сущностей v2.
//
// Склад (объектное хранилище) — ПРОДУКТОВАЯ ПОВЕРХНОСТЬ: у него есть заявка «строить вместе с ИИ», значит
// вся его логика (таблица объектов, поиск, превью) живёт в `public/`, где агент читает и правит её по
// техзаданию. В `admin/` — только Кокпит-инструменты за dev-slot: «добавить объект» (crop → хранилище →
// строка) и форма заявки ИИ. Публичная половина одинакова на витрине и в кокпите; в кокпите под ней
// добавляются инструменты владельца.
export default function Storage({
  surface,
  entities,
  lang,
}: {
  surface: Surface;
  entities: Entity[];
  lang: string;
}) {
  return (
    <div data-entity="storage" data-surface={surface} className="space-y-3">
      <MainStorage lang={lang} mode={surface === "admin" ? "admin" : "view"} />
      {surface === "admin" ? <StorageAiRequest entities={entities} lang={lang} /> : null}
    </div>
  );
}
