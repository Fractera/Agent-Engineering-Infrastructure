import type { Entity } from "../../../_data/automation.schema";
import { tableOf, typesOf } from "../entries";
import { pick } from "../../shared/localized";
import LazyBlock from "../../shared/lazy-block.client";
import CalendarLoader from "./components/calendar-loader.client";

// КАЛЕНДАРЬ «MAIN CALENDAR» — публичная половина вкладки: один конкретный календарь. ОДИН ФАЙЛ = ОДИН
// КАЛЕНДАРЬ: второй ляжет рядом и возьмёт те же общие части из `components/`. Сколько календарей —
// решает ядро (entities вкладки), как и сколько таблиц у дашборда и пультов у пульта запуска.
//
// ЗАГОЛОВОК рисуется сразу — он лёгкий и говорит, что это за календарь. ЗАПИСИ грузятся ЛЕНИВО: пока
// раздел не попал в поле зрения (а в кокпите — пока не раскрыт аккордеон), на их месте стоит контейнер
// с загрузчиком, и к серверу никто не ходит.
export default function MainCalendar({ entity, lang, heading = true }: { entity: Entity; lang: string; heading?: boolean }) {
  const title = pick((entity.data as Record<string, unknown>).title, lang) || entity.name;
  const description = pick((entity.data as Record<string, unknown>).description, lang);

  return (
    <section data-calendar-entity={entity.cuid} className="min-w-0 space-y-3">
      {/* Имя календаря рисуем ТОЛЬКО когда оно не стоит уже в шапке вложенного аккордеона: две
          одинаковые строки подряд — это не заголовок, а шум. */}
      {heading ? (
        <div className="min-w-0">
          <h4 className="truncate font-medium text-foreground">{title}</h4>
          {description ? <p className="truncate text-xs text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}
      <LazyBlock minHeight={320}>
        <CalendarLoader table={tableOf(entity)} types={typesOf(entity)} lang={lang} />
      </LazyBlock>
    </section>
  );
}
