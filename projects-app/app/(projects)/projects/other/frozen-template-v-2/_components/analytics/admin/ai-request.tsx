import type { Entity } from "../../../_data/automation.schema";
import { DevSlot } from "../../shared/dev-slot";
import { DevBuildWithAi } from "../../shared/dev-slot.client";
import { pick } from "../../shared/localized";

// АДМИНИСТРАТИВНАЯ ПОЛОВИНА аналитики — ТОЛЬКО ИНСТРУМЕНТ РАБОТЫ С ИИ (закон владельца 2026-07-24).
//
// Аналитика — ПРОДУКТОВАЯ ПОВЕРХНОСТЬ: у неё есть заявка «строить вместе с ИИ», значит вся её логика
// (графики, расчёты по строкам истории) живёт в `public/`, где агент читает её и правит по техзаданию
// («добавь график по тикерам», «покажи среднюю цену»). Здесь — только форма заявки.
export default function AnalyticsAiRequest({ entities, lang }: { entities: Entity[]; lang: string }) {
  return (
    <DevSlot>
      {entities.map((entity) => {
        const title = pick((entity.data as Record<string, unknown>).title, lang) || entity.name;
        const pending = "crudUser" in entity.info ? entity.info.crudUser : undefined;
        return (
          <DevBuildWithAi
            key={entity.cuid}
            target={{ object: "entity", tab: "analytics", cuid: entity.cuid }}
            name={title}
            pending={pending}
            lang={lang}
          />
        );
      })}
      <DevBuildWithAi target={{ object: "tab", name: "analytics" }} name="analytics" lang={lang} />
    </DevSlot>
  );
}
