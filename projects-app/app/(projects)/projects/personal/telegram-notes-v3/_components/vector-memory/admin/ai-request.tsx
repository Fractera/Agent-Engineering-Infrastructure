import type { Entity } from "../../../_data/automation.schema";
import { DevSlot } from "../../shared/dev-slot";
import { DevBuildWithAi, DevVectorAdd } from "../../shared/dev-slot.client";

// АДМИНИСТРАТИВНАЯ ПОЛОВИНА векторной памяти — Кокпит-инструменты (все за fail-silent dev-slot):
//   • «Добавить запись» (`DevVectorAdd`) — имя + текст-факт + опц. изображение (crop → объектное хранилище →
//     ссылка в `storageIds`). Каждая запись несёт `storageIds` (связи всех-ко-всем). Третий склад v2 тем же
//     образцом, что склад и локальная база.
//   • «Строить вместе с ИИ» (`DevBuildWithAi`) — заявка на КАЖДУЮ сущность и на вкладку целиком.
// Логики самой таблицы здесь НЕТ — она в `public/`, где её развивает агент по заявке.
export default function VectorMemoryAiRequest({ entities, lang }: { entities: Entity[]; lang: string }) {
  return (
    <DevSlot>
      <DevVectorAdd table="vector-memory" lang={lang} />
      {/* Векторная память — SINGLETON-вкладка (ровно одна сущность, закон владельца 2026-07-25): per-entity
          заявка дублирует «строить раздел», поэтому её нет — остаётся только заявка на вкладку. Гейт `> 1` —
          страховка на случай, если сущностей окажется больше (их тут быть не должно). */}
      {entities.length > 1
        ? entities.map((entity) => {
            const pending = "crudUser" in entity.info ? entity.info.crudUser : undefined;
            return (
              <DevBuildWithAi
                key={entity.cuid}
                target={{ object: "entity", tab: "vector-memory", cuid: entity.cuid }}
                name={entity.name}
                pending={pending}
                lang={lang}
              />
            );
          })
        : null}
      <DevBuildWithAi target={{ object: "tab", name: "vector-memory" }} name="vector-memory" lang={lang} />
    </DevSlot>
  );
}
