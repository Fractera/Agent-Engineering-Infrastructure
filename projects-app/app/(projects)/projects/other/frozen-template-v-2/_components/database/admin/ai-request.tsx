import type { Entity } from "../../../_data/automation.schema";
import { DevSlot } from "../../shared/dev-slot";
import { DevBuildWithAi, DevDatabaseAdd } from "../../shared/dev-slot.client";

// АДМИНИСТРАТИВНАЯ ПОЛОВИНА локальной базы — Кокпит-инструменты (все за fail-silent dev-slot):
//   • «Добавить строку» (`DevDatabaseAdd`) — имя + опц. изображение (crop → объектное хранилище →
//     ссылка в `storageIds`). Каждая строка по умолчанию несёт `storageIds`/`vectorIds` (связи всех-ко-всем).
//   • «Строить вместе с ИИ» (`DevBuildWithAi`) — заявка на КАЖДУЮ сущность и на вкладку целиком.
// Логики самой таблицы здесь НЕТ — она в `public/`, где её развивает агент по заявке.
export default function DatabaseAiRequest({ entities, lang }: { entities: Entity[]; lang: string }) {
  return (
    <DevSlot>
      <DevDatabaseAdd table="database" lang={lang} />
      {/* Заявки на КАЖДУЮ базу — только когда их БОЛЬШЕ ОДНОЙ (закон владельца 2026-07-25): при единственной базе
          per-entity кнопка дублирует «строить весь раздел», поэтому её не показываем; остаётся только заявка на
          вкладку целиком (ниже). Две и более — заявка на каждую + общая. */}
      {entities.length > 1
        ? entities.map((entity) => {
            const pending = "crudUser" in entity.info ? entity.info.crudUser : undefined;
            return (
              <DevBuildWithAi
                key={entity.cuid}
                target={{ object: "entity", tab: "database", cuid: entity.cuid }}
                name={entity.name}
                pending={pending}
                lang={lang}
              />
            );
          })
        : null}
      <DevBuildWithAi target={{ object: "tab", name: "database" }} name="database" lang={lang} />
    </DevSlot>
  );
}
