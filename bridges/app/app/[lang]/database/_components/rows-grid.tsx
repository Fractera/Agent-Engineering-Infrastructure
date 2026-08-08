// Сетка строк таблицы (шаг 501, Ф2, партия 3). СЕРВЕРНЫЙ компонент — ни одна
// ячейка не оживляется в браузере.
//
// Каждая ячейка — ссылка на адрес правки этой ячейки. Так клик по значению
// сохраняет привычное поведение старой панели, но состояние живёт в адресе, а не
// в тысячах клиентских компонентов.

import Link from "next/link";
import { Trash2 } from "lucide-react";
import type { TableRow } from "../_lib/tables";

export type GridLabels = { empty: string; noIdColumn: string; delete: string; edit: string };

function display(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return text;
}

export function RowsGrid(
  { table, columns, rows, hasId, hrefFor, deleteHrefFor, labels }: {
    table: string;
    columns: string[];
    rows: TableRow[];
    hasId: boolean;
    hrefFor: (rowId: string, column: string) => string;
    deleteHrefFor: (rowId: string) => string;
    labels: GridLabels;
  },
) {
  if (!rows.length) {
    return (
      <div className="flex h-32 items-center justify-center text-[11px] text-muted-foreground">
        {labels.empty}
      </div>
    );
  }

  return (
    <>
      {!hasId && (
        // Старая панель в этом случае молча подставляла `undefined` в адрес
        // запроса. Честнее сказать, что правка недоступна, и почему.
        <p className="mb-2 rounded-md border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground">
          {labels.noIdColumn}
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {columns.map((c) => (
                <th key={c} className="px-2 py-1.5 text-left font-mono font-medium text-muted-foreground">{c}</th>
              ))}
              {hasId && <th className="w-8 px-2 py-1.5" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const rowId = hasId ? String(row.id) : "";
              return (
                <tr key={rowId || i} className="border-b border-border/50 transition-colors hover:bg-muted/20">
                  {columns.map((c) => {
                    const text = display(row[c]);
                    return (
                      <td key={c} className="max-w-[260px] px-2 py-1 align-top">
                        {hasId ? (
                          <Link
                            href={hrefFor(rowId, c)}
                            title={labels.edit}
                            className="block truncate rounded px-1 font-mono text-foreground hover:bg-muted"
                          >
                            {text || <span className="text-muted-foreground/50">—</span>}
                          </Link>
                        ) : (
                          <span className="block truncate px-1 font-mono text-muted-foreground">{text || "—"}</span>
                        )}
                      </td>
                    );
                  })}
                  {hasId && (
                    <td className="px-1 py-1 align-top">
                      <Link
                        href={deleteHrefFor(rowId)}
                        title={labels.delete}
                        aria-label={labels.delete}
                        className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 size={11} />
                      </Link>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
