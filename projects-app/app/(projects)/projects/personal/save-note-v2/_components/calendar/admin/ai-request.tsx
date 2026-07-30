import { DevSlot } from "../../shared/dev-slot";
import { DevBuildWithAi } from "../../shared/dev-slot.client";

// АДМИНИСТРАТИВНАЯ ПОЛОВИНА календаря — ТОЛЬКО ИНСТРУМЕНТ РАБОТЫ С ИИ (закон владельца 2026-07-24).
//
// Календарь — ПРОДУКТОВАЯ ПОВЕРХНОСТЬ: у него есть заявка «строить вместе с ИИ», значит вся его логика
// (сетка месяца, дневной планер, интеграции, настройка календарей) живёт в `public/`, где агент читает её и
// правит по техзаданию владельца. Здесь — только форма заявки на вкладку целиком; заявка на отдельный
// календарь стоит в композиции сразу под своим календарём.
export default function CalendarAiRequest({ lang }: { lang: string }) {
  return (
    <DevSlot>
      <DevBuildWithAi target={{ object: "tab", name: "calendar" }} name="calendar" lang={lang} />
    </DevSlot>
  );
}
