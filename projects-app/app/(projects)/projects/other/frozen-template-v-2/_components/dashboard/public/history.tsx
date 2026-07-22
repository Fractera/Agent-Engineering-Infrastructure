import type { Entity } from "../../../_data/automation.schema";
import { listRows } from "../../../_lib/rows";
import { columnsOf, tableOf } from "../columns";
import { pick } from "../../shared/localized";
import DataTable, { type Row } from "./components/data-table.client";

// ТАБЛИЦА «HISTORY» — публичная половина вкладки: одна конкретная таблица дашборда. ОДИН ФАЙЛ = ОДНА
// ТАБЛИЦА: вторая ляжет рядом (`second-table.tsx` и так далее) и возьмёт те же общие части из
// `components/`. Сколько таблиц — решает ядро (entities вкладки), как и сколько пультов у пульта запуска.
//
// СЕРВЕРНЫЙ компонент: строки читаются прямо из локального хранилища (_lib/rows → _data/runtime/rows.jsonl),
// без клиентского запроса — таблица видна и с выключенным JavaScript (канон статики). Поиск, выбор колонок
// и карточка записи живут поверх этой готовой разметки.
export default async function History({ entity, lang }: { entity: Entity; lang: string }) {
  const rows = (await listRows(tableOf(entity))) as unknown as Row[];
  const columns = columnsOf(entity);
  const title = pick((entity.data as Record<string, unknown>).title, lang) || entity.name;
  const description = pick((entity.data as Record<string, unknown>).description, lang);

  return (
    <section data-dashboard-entity={entity.cuid} className="min-w-0 space-y-3">
      <div className="min-w-0">
        <h4 className="truncate font-medium text-foreground">{title}</h4>
        {description ? <p className="truncate text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <DataTable columns={columns} rows={rows} lang={lang} />
    </section>
  );
}
