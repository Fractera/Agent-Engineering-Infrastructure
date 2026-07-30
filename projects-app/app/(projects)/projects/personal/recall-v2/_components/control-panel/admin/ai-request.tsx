import type { Entity } from "../../../_data/automation.schema";
import { DevSlot } from "../../shared/dev-slot";
import { DevBuildWithAi } from "../../shared/dev-slot.client";
import { pick } from "../i18n";
import { dataText } from "../params";

// АДМИНИСТРАТИВНАЯ ПОЛОВИНА пульта — ТОЛЬКО ИНСТРУМЕНТ РАБОТЫ С ИИ (закон владельца 2026-07-24).
//
// Пульт — ПРОДУКТОВАЯ ПОВЕРХНОСТЬ: у него есть заявка «строить вместе с ИИ», значит вся его логика (форма,
// поля, отчёт о прогоне, настройка запроса) живёт в `public/`, где агент читает её и правит по техзаданию.
// Здесь — только форма заявки, и всё.
//
// ДВЕ СТУПЕНИ ЗАЯВКИ (закон ядра): на КАЖДЫЙ пульт (объект `entity`) и на вкладку целиком (объект `tab`).
export default function ControlPanelAiRequest({ entities, lang }: { entities: Entity[]; lang: string }) {
  return (
    <DevSlot>
      {/* Заявки на КАЖДУЮ сущность — только когда их БОЛЬШЕ ОДНОЙ (закон владельца 2026-07-25): при единственном
          пульте «строить этот пульт» и «строить весь раздел» — одно и то же, поэтому per-entity кнопки не
          показываем; остаётся только заявка на вкладку целиком (ниже). Две и более — заявка на каждую + общая. */}
      {entities.length > 1
        ? entities.map((entity) => {
            const title = pick(dataText(entity, "title"), lang) || entity.name;
            const pending = "crudUser" in entity.info ? entity.info.crudUser : undefined;
            return (
              <DevBuildWithAi
                key={entity.cuid}
                target={{ object: "entity", tab: "control-panel", cuid: entity.cuid }}
                name={title}
                pending={pending}
                lang={lang}
              />
            );
          })
        : null}
      <DevBuildWithAi target={{ object: "tab", name: "control-panel" }} name="control panel" lang={lang} />
    </DevSlot>
  );
}
