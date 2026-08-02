import type { Entity } from "../../../_data/automation.schema";
import { DevSlot } from "../../shared/dev-slot";
import { DevBuildWithAi } from "../../shared/dev-slot.client";

// АДМИНИСТРАТИВНАЯ ПОЛОВИНА ВКЛАДКИ «АССИСТЕНТ» (шаг 313.E — вкладка стояла без неё и нарушала стандарт
// папки: `public/` без `admin/`). Здесь ровно одно — заявка «строить вместе с ИИ», за fail-silent
// dev-slot. Логики речи здесь НЕТ: настройки поведения — продуктовая поверхность и живут в `public/`,
// а сам разговор ведёт узел `converse`, читающий эти настройки из ядра.
//
// Заявка на КАЖДУЮ сущность — только когда их больше одной (закон владельца 2026-07-25): при единственном
// наборе настроек per-entity кнопка дублировала бы заявку на вкладку целиком.
export default function AssistantAiRequest({ entities, lang }: { entities: Entity[]; lang: string }) {
  return (
    <DevSlot>
      {entities.length > 1
        ? entities.map((entity) => {
            const pending = "crudUser" in entity.info ? entity.info.crudUser : undefined;
            return (
              <DevBuildWithAi
                key={entity.cuid}
                target={{ object: "entity", tab: "assistant", cuid: entity.cuid }}
                name={entity.name}
                pending={pending}
                lang={lang}
              />
            );
          })
        : null}
      <DevBuildWithAi target={{ object: "tab", name: "assistant" }} name="assistant" lang={lang} />
    </DevSlot>
  );
}
