import type { ColumnType, DashboardTable, TableColumn } from "./table-config";

// ЯДРО → КОНФИГ ТАБЛИЦ. Единственное отличие переноса v1-таблицы в v2: конфиг не приходит из платформенного
// стора, а ВЫВОДИТСЯ из ядра автоматизации (`components.tabs[dashboard].entities[].data`). Дальше работает
// ровно v1-таблица: типы колонок, ячейки, действия, поиск, пагинация, разделённый вид.
//
// ДВЕ ФОРМЫ ОБЪЯВЛЕНИЯ КОЛОНКИ, и обе законны — иначе перенос сломал бы уже объявленные таблицы:
//   1) КОРОТКАЯ (v2 как было): `"price"` или `{ key, label }` → колонка типа `text`, видимая, source = key.
//   2) ПОЛНАЯ (как в v1): `{ key|id, header|label, type, source, defaultVisible, options }` — все восемь
//      типов, действия строки (detail | delete | live), суффиксы, цвета бейджа.
// Так автоматизация растит объявление по мере надобности: завела таблицу одной строкой, потом уточнила.

export type CoreDashboardEntity = {
  cuid: string;
  name: string;
  data: Record<string, unknown>;
};

const KNOWN_TYPES: ColumnType[] = ["badge", "text", "longtext", "number", "date", "link", "image", "actions"];

function toColumn(raw: unknown): TableColumn | null {
  if (typeof raw === "string") {
    return { id: raw, header: raw, type: "text", source: raw, defaultVisible: true };
  }
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  const key = String(c.id ?? c.key ?? "");
  if (!key) return null;
  const type = KNOWN_TYPES.includes(c.type as ColumnType) ? (c.type as ColumnType) : "text";
  return {
    id: key,
    header: (c.header ?? c.label ?? key) as TableColumn["header"],
    type,
    source: String(c.source ?? c.key ?? key),
    defaultVisible: c.defaultVisible === undefined ? true : Boolean(c.defaultVisible),
    ...(c.attr ? { attr: String(c.attr) } : {}),
    ...(c.options && typeof c.options === "object" ? { options: c.options as TableColumn["options"] } : {}),
  };
}

/** Собрать таблицы дашборда из сущностей вкладки. Одна сущность = одна таблица (закон вкладки). */
export function tablesFromCore(entities: CoreDashboardEntity[], lang: string): DashboardTable[] {
  void lang; // подписи разрешает сама таблица (`resolveLocalized`), здесь язык не нужен
  return entities.map((e) => {
    const rawCols = Array.isArray(e.data.columns) ? (e.data.columns as unknown[]) : [];
    const columns = rawCols.map(toColumn).filter((c): c is TableColumn => c !== null);
    const pageSize = Number(e.data.pageSize);
    return {
      // id таблицы = имя её хранилища: именно им дверь `api/rows` адресует строки.
      id: String(e.data.table ?? e.name).toLowerCase(),
      title: (e.data.title ?? e.name) as DashboardTable["title"],
      ...(e.data.description ? { description: e.data.description as DashboardTable["description"] } : {}),
      columns,
      ...(Number.isFinite(pageSize) && pageSize > 0 ? { pageSize } : {}),
      // Сид-строк у v2 нет: строки рождает прогон, а не конфиг — «demo»-бейдж просто не появится.
      rows: [],
      storageKey: String(e.data.table ?? e.name).toLowerCase(),
    };
  });
}
