import type { Entity } from "../../../_data/automation.schema";
import { scheduleOf } from "../schedule";
import { cronStrings } from "../i18n";
import { pick } from "../../shared/localized";
import PulseBar from "./components/pulse-bar.client";

// РАСПИСАНИЕ «MAIN SCHEDULE» — публичная половина вкладки: одно конкретное расписание. ОДИН ФАЙЛ =
// ОДНО РАСПИСАНИЕ, как таблица у дашборда и пульт у пульта запуска; сколько их — решает ядро.
//
// Показывать тут особо нечего, и это правильно: расписание — не содержимое, а такт. Поэтому публичная
// половина = живая полоса-пульс и одна честная строка о том, идёт такт или остановлен.
export default function MainSchedule({ entity, lang, heading = true }: { entity: Entity; lang: string; heading?: boolean }) {
  const L = cronStrings(lang);
  const { enabled, everyMinutes } = scheduleOf(entity);
  const title = pick((entity.data as Record<string, unknown>).title, lang) || entity.name;
  const description = pick((entity.data as Record<string, unknown>).description, lang);

  return (
    <section data-cron-entity={entity.cuid} className="min-w-0 space-y-3">
      {heading ? (
        <div className="min-w-0">
          <h4 className="truncate font-medium text-foreground">{title}</h4>
          {description ? <p className="truncate text-xs text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}
      <PulseBar everyMinutes={everyMinutes} enabled={enabled} lang={lang} />
      <p className="text-sm text-muted-foreground">{enabled ? L.running : L.paused}</p>
    </section>
  );
}
