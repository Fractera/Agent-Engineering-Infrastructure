"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CourierMapClient, { type StoreMarker } from "./components/courier-map.client";
import { mapStrings } from "../i18n";
import { onRunCompleted, onExternalRefresh } from "../../shared/run-events";
import { DataTable, type TableColumn, type TableRow } from "../../shared/data-table.client";

// ПУБЛИЧНАЯ ПОЛОВИНА КАРТЫ — ОДИН источник данных на всю вкладку.
//
// 🔒 ЧТО ЗДЕСЬ ИСПРАВЛЕНО (шаг 319.1). Метка прогона писалась в склад и связывалась с записью, но вкладка
// её не рисовала: у сущности карты в ядре был объявлен ТОЛЬКО заголовок — ни таблицы, ни колонок. Тот же
// класс дефекта, что у базы (324) и хранилища (323). Теперь источник объявлен в ядре
// (`entity.data.table` + `data.columns`), а компонент его только читает и рисует.
//
// ОДНА КАРТА, А НЕ ВТОРАЯ (закон владельца 2026-07-25, ради него удалена демо-карта Европы): метки склада
// ложатся СЛОЕМ на рабочую карту курьера, своей иконкой. Точками маршрута они не становятся — это разные
// сущности: маршрут строит человек, метки оставляет прогон.
type Row = TableRow & { lat?: unknown; lng?: unknown; title?: unknown; place?: unknown };
const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";
const TABLE = "map";

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
};

export default function MainMapClient({ lang }: { lang: string }) {
  const t = mapStrings(lang);
  const [rows, setRows] = useState<Row[]>([]);
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Состав колонок — из ЯДРА. Двери нет / колонки не объявлены → таблица не рисуется, и это честно:
  // молча показать «что получилось» значит вернуть тот самый дефект, ради которого объявление и заведено.
  useEffect(() => {
    let alive = true;
    fetch(`${apiBase()}/core?select=tab:${TABLE}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { entities?: { data?: { columns?: TableColumn[] } }[] } | null) => {
        if (alive) setColumns(d?.entities?.[0]?.data?.columns ?? []);
      })
      .catch(() => { /* нет двери — колонок не будет */ });
    return () => { alive = false; };
  }, []);

  const load = useCallback(() => {
    fetch(`${apiBase()}/rows?table=${TABLE}&limit=200`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { rows?: Row[] } | null) => { setRows(d?.rows ?? []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => onRunCompleted(() => load()), [load]);
  useEffect(() => onExternalRefresh(() => load()), [load]); // прогон из Telegram (сервер)

  // Метка без координат на карту не попадает — выдуманной точки не бывает (закон `deliverMap`). Строка
  // такой метки в таблице остаётся: склад показывает то, что в нём есть.
  const markers = useMemo<StoreMarker[]>(
    () =>
      rows.flatMap((r) => {
        const lat = num(r.lat);
        const lng = num(r.lng);
        if (lat === null || lng === null) return [];
        return [{ id: r.id, lat, lng, title: String(r.title ?? r.place ?? "") }];
      }),
    [rows],
  );

  return (
    <div className="space-y-3">
      <CourierMapClient lang={lang} markers={markers} />
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t.markers}</h3>
        {loaded ? (
          <DataTable
            columns={columns}
            rows={rows}
            lang={lang}
            table={TABLE}
            strings={{ copy: t.copy, empty: t.empty, page: t.page, of: t.of }}
          />
        ) : null}
      </section>
    </div>
  );
}
