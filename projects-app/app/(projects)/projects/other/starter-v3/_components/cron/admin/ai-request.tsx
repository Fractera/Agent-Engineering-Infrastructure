import { DevSlot } from "../../shared/dev-slot";
import { DevBuildWithAi } from "../../shared/dev-slot.client";

// АДМИНИСТРАТИВНАЯ ПОЛОВИНА расписания — ТОЛЬКО ИНСТРУМЕНТ РАБОТЫ С ИИ (закон владельца 2026-07-24).
//
// Крон — ПРОДУКТОВАЯ ПОВЕРХНОСТЬ: у него есть заявка «строить вместе с ИИ», значит вся его логика (пульс,
// форма периода, настройка расписания) живёт в `public/`, где агент читает её и правит по техзаданию.
// Здесь — только форма заявки на вкладку целиком; заявка на отдельное расписание стоит под ним самим.
export default function CronAiRequest({ lang }: { lang: string }) {
  return (
    <DevSlot>
      <DevBuildWithAi target={{ object: "tab", name: "cron" }} name="cron" lang={lang} />
    </DevSlot>
  );
}
