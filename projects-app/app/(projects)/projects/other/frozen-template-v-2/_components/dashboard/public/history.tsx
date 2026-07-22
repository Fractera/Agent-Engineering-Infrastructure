import type { Entity } from "../../../_data/automation.schema";
import { columnsOf, tableOf } from "../columns";
import { pick } from "../../shared/localized";
import LazyBlock from "../../shared/lazy-block.client";
import RowsLoader from "./components/rows-loader.client";

// ТАБЛИЦА «HISTORY» — публичная половина вкладки: одна конкретная таблица дашборда. ОДИН ФАЙЛ = ОДНА
// ТАБЛИЦА: вторая лежит рядом (`second-table.tsx`) и берёт те же общие части из `components/`.
// Сколько таблиц — решает ядро (entities вкладки), как и сколько пультов у пульта запуска.
//
// ЗАГОЛОВОК рисуется сразу — он лёгкий и говорит, что это за таблица. СТРОКИ грузятся ЛЕНИВО: пока раздел
// не попал в поле зрения (а в кокпите — пока не раскрыт аккордеон), на их месте стоит контейнер с
// загрузчиком, и к серверу никто не ходит. Строки — самая тяжёлая часть страницы, и тянуть их заранее
// запрещено (владелец 2026-07-22).
export default function History({ entity, lang }: { entity: Entity; lang: string }) {
  const title = pick((entity.data as Record<string, unknown>).title, lang) || entity.name;
  const description = pick((entity.data as Record<string, unknown>).description, lang);

  return (
    <section data-dashboard-entity={entity.cuid} className="min-w-0 space-y-3">
      <div className="min-w-0">
        <h4 className="truncate font-medium text-foreground">{title}</h4>
        {description ? <p className="truncate text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <LazyBlock minHeight={200}>
        <RowsLoader table={tableOf(entity)} columns={columnsOf(entity)} lang={lang} />
      </LazyBlock>
    </section>
  );
}
