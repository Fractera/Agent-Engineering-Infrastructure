import type { Entity } from "../../_data/automation.schema";
import type { Surface } from "../surface";
import MainVectorMemory from "./public/main-vector-memory";
import VectorMemoryAiRequest from "./admin/ai-request";

// МАРШРУТИЗАТОР ВЕКТОРНОЙ ПАМЯТИ — та же тройка index/public/admin, что у склада и локальной базы (третий
// склад v2 тем же образцом).
//
// Векторная память — ПРОДУКТОВАЯ ПОВЕРХНОСТЬ: у неё есть заявка «строить вместе с ИИ», значит вся логика
// (таблица записей-фактов, связи storageIds, поиск) живёт в `public/`, где агент читает и правит её по
// техзаданию. В `admin/` — только Кокпит-инструменты за dev-slot: «добавить запись» (имя + текст-факт +
// изображение → хранилище → ссылка) и форма заявки ИИ.
export default function VectorMemory({
  surface,
  entities,
  lang,
}: {
  surface: Surface;
  entities: Entity[];
  lang: string;
}) {
  return (
    <div data-entity="vector-memory" data-surface={surface} className="space-y-3">
      <MainVectorMemory lang={lang} mode={surface === "admin" ? "admin" : "view"} />
      {surface === "admin" ? <VectorMemoryAiRequest entities={entities} lang={lang} /> : null}
    </div>
  );
}
