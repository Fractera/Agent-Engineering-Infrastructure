import type { Entity } from "../../../_data/automation.schema";
import { DevSlot } from "../../shared/dev-slot";
import { DevBuildWithAi } from "../../shared/dev-slot.client";
import { pick } from "../../shared/localized";
import { SelectedEntityRequests, type EntityLite } from "./selected-requests.client";

// АДМИНИСТРАТИВНАЯ ПОЛОВИНА дашборда — ТОЛЬКО ИНСТРУМЕНТ РАБОТЫ С ИИ (закон владельца 2026-07-24).
//
// Здесь нет ни строчки логики таблицы: вся она живёт в `public/`, потому что именно её агент читает и
// правит по заявке. В админ-слое — форма «Строить вместе с ИИ»: владелец пишет техзадание («поставь видео
// в колонку», «сделай калькулятор в ячейке»), оно ложится в ядро, агент читает исходники папки и правит
// публичную половину.
//
// ДВЕ СТУПЕНИ ЗАЯВКИ (закон ядра): на КАЖДУЮ таблицу (объект `entity`) и на вкладку целиком (объект `tab`).
export default function DashboardAiRequest({ entities, lang }: { entities: Entity[]; lang: string }) {
  // Сериализуемый список таблиц для клиентской врезки. `tableId` = id таблицы (как в `from-core`:
  // data.table ?? name, в нижнем регистре) — по нему клиент сопоставляет открытую таблицу с её сущностью.
  const lite: EntityLite[] = entities.map((entity) => {
    const data = entity.data as Record<string, unknown>;
    return {
      cuid: entity.cuid,
      tableId: String(data.table ?? entity.name).toLowerCase(),
      title: pick(data.title, lang) || entity.name,
      pending: "crudUser" in entity.info ? (entity.info.crudUser as string | undefined) : undefined,
    };
  });
  return (
    <DevSlot>
      {/* Заявка на ТАБЛИЦУ — только когда их БОЛЬШЕ ОДНОЙ (закон владельца 2026-07-25: при единственной
          таблице per-entity кнопка дублирует «строить весь раздел»). И ТОЛЬКО для ОТКРЫТОЙ таблицы (баг
          владельца 2026-07-30): клиентская врезка следит за выбором контейнера и рисует заявку лишь для той
          таблицы, что сейчас на экране, а не для всех сразу. */}
      {lite.length > 1 ? <SelectedEntityRequests entities={lite} lang={lang} /> : null}
      <DevBuildWithAi target={{ object: "tab", name: "dashboard" }} name="dashboard" lang={lang} />
    </DevSlot>
  );
}
