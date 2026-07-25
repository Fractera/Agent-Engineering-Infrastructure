import type { Entity } from "../../_data/automation.schema";
import type { Surface } from "../surface";
import MainDatabase from "./public/main-database";
import DatabaseAiRequest from "./admin/ai-request";

// МАРШРУТИЗАТОР ЛОКАЛЬНОЙ БАЗЫ — та же тройка index/public/admin, что у всех сущностей v2.
//
// Локальная база — ПРОДУКТОВАЯ ПОВЕРХНОСТЬ: у неё есть заявка «строить вместе с ИИ», значит вся логика
// (таблица записей, связи storageIds/vectorIds, поиск) живёт в `public/`, где агент читает и правит её по
// техзаданию. В `admin/` — только Кокпит-инструменты за dev-slot: «добавить строку» (имя + изображение →
// хранилище → ссылка) и форма заявки ИИ.
export default function Database({
  surface,
  entities,
  lang,
}: {
  surface: Surface;
  entities: Entity[];
  lang: string;
}) {
  return (
    <div data-entity="database" data-surface={surface} className="space-y-3">
      <MainDatabase lang={lang} mode={surface === "admin" ? "admin" : "view"} />
      {surface === "admin" ? <DatabaseAiRequest entities={entities} lang={lang} /> : null}
    </div>
  );
}
