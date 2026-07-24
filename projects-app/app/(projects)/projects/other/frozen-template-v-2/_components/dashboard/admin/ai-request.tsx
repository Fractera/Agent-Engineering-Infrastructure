import type { Entity } from "../../../_data/automation.schema";
import { DevSlot } from "../../shared/dev-slot";
import { DevBuildWithAi } from "../../shared/dev-slot.client";
import { pick } from "../../shared/localized";

// АДМИНИСТРАТИВНАЯ ПОЛОВИНА дашборда — ТОЛЬКО ИНСТРУМЕНТ РАБОТЫ С ИИ (закон владельца 2026-07-24).
//
// Здесь нет ни строчки логики таблицы: вся она живёт в `public/`, потому что именно её агент читает и
// правит по заявке. В админ-слое — форма «Строить вместе с ИИ»: владелец пишет техзадание («поставь видео
// в колонку», «сделай калькулятор в ячейке»), оно ложится в ядро, агент читает исходники папки и правит
// публичную половину.
//
// ДВЕ СТУПЕНИ ЗАЯВКИ (закон ядра): на КАЖДУЮ таблицу (объект `entity`) и на вкладку целиком (объект `tab`).
export default function DashboardAiRequest({ entities, lang }: { entities: Entity[]; lang: string }) {
  return (
    <DevSlot>
      {entities.map((entity) => {
        const title = pick((entity.data as Record<string, unknown>).title, lang) || entity.name;
        const pending = "crudUser" in entity.info ? entity.info.crudUser : undefined;
        return (
          <DevBuildWithAi
            key={entity.cuid}
            target={{ object: "entity", tab: "dashboard", cuid: entity.cuid }}
            name={title}
            pending={pending}
            lang={lang}
          />
        );
      })}
      <DevBuildWithAi target={{ object: "tab", name: "dashboard" }} name="dashboard" lang={lang} />
    </DevSlot>
  );
}
