"use client";

import { useEffect, useState } from "react";
import type { Column } from "../../columns";
import { dashboardStrings } from "../../i18n";
import DataTable, { type Row } from "./data-table.client";

// ЗАГРУЗЧИК СТРОК — идёт за данными таблицы В СВОЮ ДВЕРЬ `api/rows` и только тогда рисует таблицу.
// Монтируется ВНУТРИ ленивого блока, поэтому запрос уходит не раньше, чем раздел попал в поле зрения:
// строки — самая тяжёлая часть страницы, и тянуть их заранее запрещено (владелец 2026-07-22).
//
// Дверь адресуется ОТНОСИТЕЛЬНО текущего пути — без хардкода слага (закон 0: папка переносима).
// Пока запрос идёт, на месте таблицы крутится тот же загрузчик, что и у ленивого блока; ошибка сети
// показывается строкой, а не пустой таблицей: пусто и «не смогли» — разные вещи.
export default function RowsLoader({ table, columns, lang }: { table: string; columns: Column[]; lang: string }) {
  const L = dashboardStrings(lang);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const apiBase = location.pathname.replace(/\/+$/, "") + "/api";
        const r = await fetch(`${apiBase}/rows?table=${encodeURIComponent(table)}`, { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const d = (await r.json()) as { rows: Row[] };
        if (alive) setRows(d.rows ?? []);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => { alive = false; };
  }, [table]);

  if (failed) return <p className="py-2 text-sm text-rose-700 dark:text-rose-400">{L.empty}</p>;
  if (rows === null) {
    return (
      <div className="flex min-h-24 items-center justify-center">
        <span className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      </div>
    );
  }
  return <DataTable columns={columns} rows={rows} lang={lang} />;
}
