import type { Entity } from "../../_data/automation.schema";
import MainDatabase from "./public/main-database";
import DatabaseAiRequest from "./admin/ai-request";

// МАРШРУТИЗАТОР ЛОКАЛЬНОЙ БАЗЫ — та же тройка index/public/admin, что у всех сущностей v2.
//
// Локальная база — ПРОДУКТОВАЯ ПОВЕРХНОСТЬ: у неё есть заявка «строить вместе с ИИ», значит вся логика
// (таблица записей, связи storageIds/vectorIds, поиск) живёт в `public/`, где агент читает и правит её по
// техзаданию. В `admin/` — только Кокпит-инструменты за dev-slot: «добавить строку» (имя + изображение →
// хранилище → ссылка) и форма заявки ИИ.
export default function Database({ entities, lang }: { entities: Entity[]; lang: string }) {
  return (
    <div data-entity="database" className="space-y-3">
      <MainDatabase lang={lang} mode="admin" />
      <DatabaseAiRequest entities={entities} lang={lang} />
    </div>
  );
}
