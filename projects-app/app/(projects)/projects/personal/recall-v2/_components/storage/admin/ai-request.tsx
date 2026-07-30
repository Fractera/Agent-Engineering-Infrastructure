import type { Entity } from "../../../_data/automation.schema";
import { DevSlot } from "../../shared/dev-slot";
import { DevBuildWithAi, DevStorageAdd } from "../../shared/dev-slot.client";

// АДМИНИСТРАТИВНАЯ ПОЛОВИНА склада — Кокпит-инструменты (все за fail-silent dev-slot).
//
//   • «Добавить объект» (`DevStorageAdd`) — ручная запись изображения: выбрать файл → crop → объектное
//     хранилище (`api/files`) → строка базы (`api/rows`). Живёт в `_shared-v2`, зовёт crop из
//     `_shared-v2/tools/image-crop`; в папку его код не копируется (закон 0, единственный путь — dev-slot).
//   • «Строить вместе с ИИ» (`DevBuildWithAi`) — заявка на разработку: на КАЖДУЮ сущность склада и на
//     вкладку целиком (закон именования раскрывашек).
//
// Логики самой таблицы здесь НЕТ — она в `public/`, где её развивает агент по заявке.
export default function StorageAiRequest({ entities, lang }: { entities: Entity[]; lang: string }) {
  return (
    <DevSlot>
      <DevStorageAdd table="storage" lang={lang} />
      {/* Хранилище — SINGLETON-вкладка (ровно одна сущность, закон владельца 2026-07-25): заявка «строить эту
          сущность» и «строить раздел» — одно и то же, поэтому per-entity кнопок нет, остаётся только заявка на
          вкладку. Гейт `> 1` защищает и на случай, если сущностей окажется больше (их тут быть не должно). */}
      {entities.length > 1
        ? entities.map((entity) => {
            const pending = "crudUser" in entity.info ? entity.info.crudUser : undefined;
            return (
              <DevBuildWithAi
                key={entity.cuid}
                target={{ object: "entity", tab: "storage", cuid: entity.cuid }}
                name={entity.name}
                pending={pending}
                lang={lang}
              />
            );
          })
        : null}
      <DevBuildWithAi target={{ object: "tab", name: "storage" }} name="storage" lang={lang} />
    </DevSlot>
  );
}
