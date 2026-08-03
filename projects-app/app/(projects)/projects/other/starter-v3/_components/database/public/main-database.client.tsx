"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { databaseStrings } from "../i18n";
import { onRunCompleted, onExternalRefresh } from "../../shared/run-events";
import { DataTable, type TableColumn, type TableRow } from "../../shared/data-table.client";

// ПУБЛИЧНАЯ ПОЛОВИНА ЛОКАЛЬНОЙ БАЗЫ — записи + поиск. Продуктовая поверхность: логика вкладки живёт здесь,
// где её развивает агент по заявке. Добавление строки — Кокпит-инструмент из дев-слоя (DOM-событие).
//
// 🔒 ДВА ЗАКОНА, КОТОРЫХ ЗДЕСЬ БОЛЬШЕ НЕТ, И ЭТО ПРАВИЛЬНО:
//   СОСТАВ КОЛОНОК объявлен в ЯДРЕ (`entity.data.columns`) — пока он был зашит здесь, закон записи
//   исполнялся, а владелец видел устаревшую таблицу без карты и календаря (шаг 324);
//   ВИД ТАБЛИЦЫ (минимальная ширина колонки, горизонтальная прокрутка, страница в 10 записей, ячейка не
//   выше четырёх строк) живёт в общем `shared/data-table.client.tsx` — один интерфейс на все вкладки.
type Row = TableRow & { createdAt?: string };
const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";
const TABLE = "database";

export default function MainDatabaseClient({ lang, mode }: { lang: string; mode: "view" | "admin" }) {
  const t = databaseStrings(lang);
  const [rows, setRows] = useState<Row[]>([]);
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [query, setQuery] = useState(""); // текст в поле
  const [applied, setApplied] = useState(""); // что реально искали (кнопкой/Enter)
  const [loaded, setLoaded] = useState(false);

  // Состав колонок — из ядра. Двери нет / колонки не объявлены → таблица не рисуется, и это честно:
  // молча показать «что получилось» значит вернуть дефект, ради которого объявление и заведено.
  useEffect(() => {
    let alive = true;
    fetch(`${apiBase()}/core?select=tab:database`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { entities?: { data?: { columns?: TableColumn[] } }[] } | null) => {
        if (alive) setColumns(d?.entities?.[0]?.data?.columns ?? []);
      })
      .catch(() => { /* нет двери — колонок не будет */ });
    return () => { alive = false; };
  }, []);

  const load = useCallback((q: string) => {
    fetch(`${apiBase()}/rows?table=${TABLE}&limit=200&search=${encodeURIComponent(q)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { rows?: Row[] } | null) => { setRows(d?.rows ?? []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  // Первичная загрузка — весь список. Дальше поиск запускает ТОЛЬКО кнопка «Искать» (или Enter).
  useEffect(() => { load(""); }, [load]);
  useEffect(() => onRunCompleted(() => load(applied)), [load, applied]);
  useEffect(() => onExternalRefresh(() => load(applied)), [load, applied]); // прогон из Telegram (сервер)

  const runSearch = () => { const q = query.trim(); setApplied(q); load(q); };

  const del = async (id: string) => {
    if (!window.confirm(t.confirmDelete)) return;
    await fetch(`${apiBase()}/rows?table=${TABLE}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    load(applied);
  };

  return (
    <div className="space-y-3" data-entity-view="database">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
            placeholder={t.search}
            className="max-w-xs"
          />
          <Button variant="secondary" size="sm" onClick={runSearch}>{t.searchBtn}</Button>
        </div>
        {mode === "admin" ? (
          <Button size="sm" onClick={() => window.dispatchEvent(new CustomEvent("fractera:database-add"))}>
            {t.addRecord}
          </Button>
        ) : null}
      </div>

      {applied ? <p className="text-xs text-muted-foreground">{t.found}: {rows.length}</p> : null}

      {loaded ? (
        <DataTable
          columns={columns}
          rows={rows}
          lang={lang}
          table={TABLE}
          strings={{ copy: t.copy, empty: t.empty, page: t.page, of: t.of }}
          rowActions={mode === "admin" ? (r) => (
            <Button variant="outline" size="xs" onClick={() => del(r.id)}>{t.del}</Button>
          ) : undefined}
        />
      ) : null}
    </div>
  );
}
