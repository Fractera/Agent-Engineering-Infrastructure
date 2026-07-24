"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, DollarSign } from "lucide-react";
import { DayBars, type DayBar } from "./components/day-bars.client";
import { analyticsStrings } from "../i18n";

// АНАЛИТИКА — РАНТАЙМ (public). ДВА графика горизонтальных столбиков за ПОСЛЕДНИЕ 7 ДНЕЙ (по числу дней
// недели), считаются из ЖИВЫХ строк истории (`api/rows`, та же дверь, что кормит дашборд):
//   1. сколько запросов сделано в каждый день (штук);
//   2. суммарная стоимость акций за каждый день (сумма поля `price`).
//
// Самодостаточно (закон 0): дверь адресуется относительно пути страницы, названия дней даёт `Intl` из
// языка страницы (без словаря), столбики — на div'ах (без чартовой библиотеки).
type Row = Record<string, unknown>;
const apiBase = () => location.pathname.replace(/\/+$/, "") + "/api";
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function MainAnalytics({ lang }: { lang: string }) {
  const L = analyticsStrings(lang);
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`${apiBase()}/rows?table=history&limit=1000`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { rows?: Row[] } | null) => { if (alive) { setRows(d?.rows ?? []); setLoaded(true); } })
      .catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);

  // СЕМЬ ПОСЛЕДНИХ ДНЕЙ, старые сверху. Для каждого — число запросов и сумма цен. Строку относим к дню по
  // её `createdAt` (рождение записи), а не по полю `date`: последнее агент может переопределить, а момент
  // запроса — факт.
  const { requests, values } = useMemo(() => {
    const count = new Map<string, number>();
    const sum = new Map<string, number>();
    for (const r of rows) {
      const iso = String(r.createdAt ?? r.date ?? "");
      const day = iso.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      count.set(day, (count.get(day) ?? 0) + 1);
      const price = Number(r.price);
      if (Number.isFinite(price)) sum.set(day, (sum.get(day) ?? 0) + price);
    }
    const weekday = new Intl.DateTimeFormat(lang, { weekday: "short" });
    const req: DayBar[] = [];
    const val: DayBar[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = dayKey(d);
      const label = weekday.format(d);
      const n = count.get(key) ?? 0;
      const s = sum.get(key) ?? 0;
      req.push({ label, value: n, display: String(n) });
      val.push({ label, value: s, display: s ? s.toLocaleString(lang, { maximumFractionDigits: 0 }) : "0" });
    }
    return { requests: req, values: val };
  }, [rows, lang]);

  const hasData = requests.some((d) => d.value > 0);

  return (
    <div className="space-y-4" data-entity-view="analytics">
      {loaded && !hasData ? (
        <p className="text-sm text-muted-foreground">{L.empty}</p>
      ) : null}

      <section className="space-y-2 rounded-lg border p-3">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="size-4 text-muted-foreground" /> {L.requestsTitle}
        </h4>
        <DayBars data={requests} color="var(--color-primary)" unit={L.requestsUnit} />
      </section>

      <section className="space-y-2 rounded-lg border p-3">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <DollarSign className="size-4 text-muted-foreground" /> {L.valueTitle}
        </h4>
        <DayBars data={values} color="var(--color-primary)" />
      </section>
    </div>
  );
}
