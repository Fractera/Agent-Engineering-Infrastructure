import type { Entity } from "../../../_data/automation.schema";
import { scheduleOf } from "../schedule";
import { cronStrings } from "../i18n";
import { pick } from "../../shared/localized";
import ScheduleForm from "./components/schedule-form.client";

// НАСТРОЙКА РАСПИСАНИЯ — административная половина вкладки: дописывается ПОД публичной и видна только
// владельцу. Тот же закон, что у пульта, дашборда и календаря: использование отдельно, управление
// отдельно. Раскрывашка на <details> — открывается без JavaScript, сама форма без него не работает и
// честно этого не скрывает (менять такт без JS негде).
export default function CronSettings({ entities, lang }: { entities: Entity[]; lang: string }) {
  const L = cronStrings(lang);

  return (
    <section data-cron="admin" className="border-t pt-3">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center py-2 text-sm font-medium hover:underline">
          {L.settings}
        </summary>
        <div className="space-y-4 pb-2 pt-1">
          <p className="text-xs text-muted-foreground">{L.settingsHint}</p>
          {entities.map((entity) => (
            <div key={entity.cuid} className="space-y-2">
              <p className="text-sm font-medium">
                {pick((entity.data as Record<string, unknown>).title, lang) || entity.name}
              </p>
              <ScheduleForm cuid={entity.cuid} settings={scheduleOf(entity)} lang={lang} />
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
