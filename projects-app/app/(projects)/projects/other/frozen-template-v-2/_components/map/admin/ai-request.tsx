import type { Entity } from "../../../_data/automation.schema";
import { DevSlot } from "../../shared/dev-slot";
import { DevBuildWithAi } from "../../shared/dev-slot.client";
import { pick } from "../../shared/localized";

// АДМИНИСТРАТИВНАЯ ПОЛОВИНА карты — ТОЛЬКО ИНСТРУМЕНТ РАБОТЫ С ИИ (закон владельца 2026-07-24).
//
// Карта — ПРОДУКТОВАЯ ПОВЕРХНОСТЬ: у неё есть заявка «строить вместе с ИИ», значит вся её логика (тайлы,
// пины, ящик города) живёт в `public/`, где агент читает её и правит по техзаданию («покажи мои склады»,
// «добавь маршрут»). Здесь — только форма заявки: на каждую карту (entity) и на вкладку целиком (tab).
export default function MapAiRequest({ entities, lang }: { entities: Entity[]; lang: string }) {
  return (
    <DevSlot>
      {entities.map((entity) => {
        const title = pick((entity.data as Record<string, unknown>).title, lang) || entity.name;
        const pending = "crudUser" in entity.info ? entity.info.crudUser : undefined;
        return (
          <DevBuildWithAi
            key={entity.cuid}
            target={{ object: "entity", tab: "map", cuid: entity.cuid }}
            name={title}
            pending={pending}
            lang={lang}
          />
        );
      })}
      <DevBuildWithAi target={{ object: "tab", name: "map" }} name="map" lang={lang} />
    </DevSlot>
  );
}
