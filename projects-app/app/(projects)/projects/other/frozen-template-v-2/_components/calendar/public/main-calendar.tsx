import type { Entity } from "../../../_data/automation.schema";
import type { Surface } from "../../surface";
import type { CronSettings } from "../../cron/schedule";
import { tableOf, typesOf } from "../entries";
import { integrationsOf } from "../integrations";
import { calendarStrings } from "../i18n";
import { pick } from "../../shared/localized";
import LazyBlock from "../../shared/lazy-block.client";
import CalendarLoader from "./components/calendar-loader.client";
import IntegrationsMenu from "./components/integrations-menu.client";

// КАЛЕНДАРЬ «MAIN CALENDAR» — публичная половина вкладки: один конкретный календарь. ОДИН ФАЙЛ = ОДИН
// КАЛЕНДАРЬ: второй ляжет рядом и возьмёт те же общие части из `components/`. Сколько календарей —
// решает ядро (entities вкладки), как и сколько таблиц у дашборда и пультов у пульта запуска.
//
// ШАПКА КАЛЕНДАРЯ повторяет шапку таблицы дашборда: слева имя, справа выпадающий список (у таблицы —
// колонки, здесь — интеграции). Список стоит в шапке ВСЕГДА, даже когда имя ушло в заголовок вложенного
// аккордеона: он принадлежит календарю, а не подписи над ним.
//
// ЗАПИСИ грузятся ЛЕНИВО: пока раздел не попал в поле зрения (а в кокпите — пока не раскрыт аккордеон),
// на их месте стоит контейнер с загрузчиком, и к серверу никто не ходит.
export default function MainCalendar({
  entity,
  cron,
  surface,
  lang,
  heading = true,
}: {
  entity: Entity;
  cron: CronSettings | null;
  surface: Surface;
  lang: string;
  heading?: boolean;
}) {
  const L = calendarStrings(lang);
  const title = pick((entity.data as Record<string, unknown>).title, lang) || entity.name;
  const description = pick((entity.data as Record<string, unknown>).description, lang);
  const integrations = integrationsOf(entity);

  return (
    <section data-calendar-entity={entity.cuid} className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        {/* Имя календаря рисуем ТОЛЬКО когда оно не стоит уже в шапке вложенного аккордеона: две
            одинаковые строки подряд — это не заголовок, а шум. */}
        {heading ? (
          <div className="min-w-0">
            <h4 className="truncate font-medium text-foreground">{title}</h4>
            {description ? <p className="truncate text-xs text-muted-foreground">{description}</p> : null}
          </div>
        ) : (
          <span />
        )}
        <IntegrationsMenu cuid={entity.cuid} integrations={integrations} surface={surface} lang={lang} />
      </div>

      {/* Нет расписания — календарь честно говорит, что напоминать некому. Молчаливый календарь,
          который «должен был» предупредить, хуже, чем календарь, сказавший о своём молчании. */}
      {cron?.enabled ? null : <p className="text-xs text-muted-foreground">{L.noSchedule}</p>}

      <LazyBlock minHeight={320}>
        <CalendarLoader
          table={tableOf(entity)}
          types={typesOf(entity)}
          integrations={integrations}
          cron={cron}
          surface={surface}
          lang={lang}
        />
      </LazyBlock>
    </section>
  );
}
