"use client";

import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { linksOf } from "../../_data/record.schema";
import { EntityDrawer, type DrawerTarget } from "./entity-drawer.client";

// ЕДИНАЯ ТАБЛИЦА АВТОМАТИЗАЦИИ (требование владельца 2026-08-02: «везде должен быть одинаковый интерфейс
// таблиц»). Три закона живут ЗДЕСЬ ОДИН РАЗ, а не повторяются в каждой вкладке — иначе они разъедутся так
// же, как разъехались колонки базы:
//
//   1. МИНИМАЛЬНАЯ ШИРИНА КОЛОНКИ + ГОРИЗОНТАЛЬНАЯ ПРОКРУТКА. Колонка не сжимается ниже своего минимума;
//      когда места не хватает, прокручивается ТАБЛИЦА, а не ломается вёрстка. Следствие, которое можно
//      объявлять законом: ЛИМИТА НА ЧИСЛО КОЛОНОК НЕТ.
//   2. СТРАНИЦА — 10 ЗАПИСЕЙ, пагинация стандартным shadcn (`@/components/ui/pagination`).
//   3. ЯЧЕЙКА — НЕ БОЛЬШЕ ЧЕТЫРЁХ СТРОК. Не влезло — обрывается многоточием, полный текст в подсказке.
//      Найдено на дефекте таблицы дашборда: одна длинная ячейка растягивала строку на пол-экрана.

export type CellType = "chip" | "ids" | "text" | "date" | "badge" | "image" | "actions";

export type TableColumn = {
  key: string;
  /** Подписи по языкам (из ядра) либо готовая строка. */
  label: Record<string, string> | string;
  type: CellType;
  /** Поле строки или `links:<склад>` — тогда значение это МАССИВ id соседних строк. */
  source: string;
  /** Минимальная ширина в пикселях. Не задана — берётся значение по типу (см. `MIN_WIDTH`). */
  minWidth?: number;
};

export type TableRow = { id: string } & Record<string, unknown>;

/** Минимумы по типам: id узкий, текст широкий. Одна таблица минимумов на всю автоматизацию. */
const MIN_WIDTH: Record<CellType, number> = {
  chip: 96,
  ids: 120,
  text: 220,
  date: 120,
  badge: 120,
  image: 96,
  actions: 88,
};

/** 🔒 Страница — 10 записей. Число живёт здесь: у таблиц один интерфейс, а не десять договорённостей. */
export const PAGE_SIZE = 10;

/** Минимум по типу колонки — для таблиц, которые строят разметку сами (дашборд). Одна таблица минимумов. */
export const minWidthOf = (type: string): number => MIN_WIDTH[(type as CellType)] ?? MIN_WIDTH.text;

const labelOf = (label: TableColumn["label"], lang: string): string =>
  typeof label === "string" ? label : label[lang] ?? label.en ?? "";

/** Значение ячейки: `links:<склад>` → массив id (с фолбэком на старые поля), иначе поле строки. */
export function cellValue(row: TableRow, source: string): unknown {
  if (!source.startsWith("links:")) return row[source];
  const table = source.slice("links:".length);
  const legacy = table === "storage" ? row.storageIds : table === "vector-memory" ? row.vectorIds : undefined;
  return linksOf(row, table, legacy);
}

function IdChip({ id, copyLabel }: { id: string; copyLabel: string }) {
  const [copied, setCopied] = useState(false);
  if (!id) return <span className="text-muted-foreground">—</span>;
  const shown = id.length > 5 ? `${id.slice(0, 5)}…` : id;
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs" title={id}>
      {shown}
      <button
        type="button"
        aria-label={copyLabel}
        className="text-muted-foreground transition-colors hover:text-foreground"
        onClick={async () => {
          try { await navigator.clipboard.writeText(id); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* буфер недоступен */ }
        }}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </span>
  );
}

/** Пустой массив рисуется ПРОЧЕРКОМ: «связей нет» — это ответ, а не пустая ячейка (закон 324 §2). */
function IdChips({ ids, copyLabel }: { ids: string[]; copyLabel: string }) {
  if (!ids.length) return <span className="text-muted-foreground">—</span>;
  return <span className="flex flex-col gap-1">{ids.map((id) => <IdChip key={id} id={id} copyLabel={copyLabel} />)}</span>;
}

export type DataTableStrings = { copy: string; empty: string; page: string; of: string };

export function DataTable({
  columns,
  rows,
  lang,
  strings,
  table,
  rowActions,
  renderCell,
}: {
  columns: TableColumn[];
  rows: TableRow[];
  lang: string;
  strings: DataTableStrings;
  /** Имя склада этих строк. Задано — строка КЛИКАБЕЛЬНА и открывает ящик сущности (шаг 328). */
  table?: string;
  /** Кнопки строки (кокпит): удалить, открыть. Отсутствуют — колонка действий не рисуется. */
  rowActions?: (row: TableRow) => ReactNode;
  /** Своя отрисовка для типов, которых нет в общем наборе (например превью изображения). */
  renderCell?: (row: TableRow, column: TableColumn, value: unknown) => ReactNode | undefined;
}) {
  const [page, setPage] = useState(0);
  // ЯЩИК СУЩНОСТИ ЖИВЁТ В САМОЙ ТАБЛИЦЕ (шаг 328): так его получают ВСЕ вкладки разом и ни одна не может
  // забыть подключить. Клик по кнопке/ссылке внутри ячейки ящик НЕ открывает — у них своя работа.
  const [target, setTarget] = useState<DrawerTarget>(null);
  const openRow = (e: MouseEvent<HTMLTableRowElement>, row: TableRow) => {
    if (!table) return;
    if ((e.target as HTMLElement).closest("button,a,input,select,textarea")) return;
    setTarget({ table, id: row.id });
  };
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const slice = useMemo(() => rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE), [rows, current]);

  if (!columns.length || !rows.length) return <p className="text-sm text-muted-foreground">{strings.empty}</p>;

  const fmtDate = (v: unknown) => { const s = String(v ?? ""); return s ? new Date(s).toLocaleDateString(lang) : "—"; };

  return (
    <div className="space-y-3">
      {/* Закон 1: прокручивается ТАБЛИЦА. `w-max` не даёт колонкам ужиматься ниже их минимума. */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-max min-w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-3 py-2 font-medium" style={{ minWidth: c.minWidth ?? MIN_WIDTH[c.type] }}>
                  {labelOf(c.label, lang)}
                </th>
              ))}
              {rowActions ? <th className="px-3 py-2" style={{ minWidth: MIN_WIDTH.actions }} /> : null}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr
                key={r.id}
                onClick={(e) => openRow(e, r)}
                className={`border-b align-top last:border-0${table ? " cursor-pointer transition-colors hover:bg-muted/40" : ""}`}
              >
                {columns.map((c) => {
                  const v = cellValue(r, c.source);
                  const custom = renderCell?.(r, c, v);
                  if (custom !== undefined) {
                    return <td key={c.key} className="px-3 py-2" style={{ minWidth: c.minWidth ?? MIN_WIDTH[c.type] }}>{custom}</td>;
                  }
                  const cell =
                    c.type === "chip" ? <IdChip id={String(v ?? "")} copyLabel={strings.copy} />
                    : c.type === "ids" ? <IdChips ids={Array.isArray(v) ? v.map(String) : []} copyLabel={strings.copy} />
                    : c.type === "date" ? <span className="tabular-nums">{fmtDate(v)}</span>
                    : c.type === "badge" ? <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{String(v ?? "—")}</span>
                    // Закон 3: не больше четырёх строк, дальше обрыв; целиком — в подсказке.
                    : <span className="line-clamp-4 break-words" title={String(v ?? "")}>{String(v ?? "") || "—"}</span>;
                  return <td key={c.key} className="px-3 py-2" style={{ minWidth: c.minWidth ?? MIN_WIDTH[c.type] }}>{cell}</td>;
                })}
                {rowActions ? <td className="px-3 py-2 text-right">{rowActions(r)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Закон 2: страница — 10 записей. Одна страница — навигация не нужна и не рисуется. */}
      {pages > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{strings.page} {current + 1} {strings.of} {pages}</span>
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious disabled={current === 0} onClick={() => setPage(current - 1)} />
              </PaginationItem>
              {Array.from({ length: pages }, (_, i) => i)
                .filter((i) => i === 0 || i === pages - 1 || Math.abs(i - current) <= 1)
                .map((i, idx, arr) => (
                  <PaginationItem key={i}>
                    {idx > 0 && i - arr[idx - 1] > 1 ? <span className="px-1 text-muted-foreground">…</span> : null}
                    <PaginationLink isActive={i === current} onClick={() => setPage(i)}>{i + 1}</PaginationLink>
                  </PaginationItem>
                ))}
              <PaginationItem>
                <PaginationNext disabled={current === pages - 1} onClick={() => setPage(current + 1)} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}

      <EntityDrawer target={target} onClose={() => setTarget(null)} lang={lang} />
    </div>
  );
}

export { Button };
