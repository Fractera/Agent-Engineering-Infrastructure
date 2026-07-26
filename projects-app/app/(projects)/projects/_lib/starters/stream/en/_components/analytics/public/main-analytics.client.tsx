"use client";

import { useEffect, useMemo, useState } from "react";
import { AlignLeft, BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { analyticsStrings } from "../i18n";

// АНАЛИТИКА — РАНТАЙМ (public). ДВА графика ВЕРТИКАЛЬНЫХ столбиков (shadcn charts / recharts) за ПОСЛЕДНИЕ
// 7 ДНЕЙ (по числу дней недели), из ЖИВЫХ строк истории (`api/rows`, та же дверь, что кормит дашборд):
//   1. сколько сообщений захвачено в каждый день (штук);
//   2. объём захваченного текста за каждый день (сумма длин поля `text`, в знаках).
//
// Каждый график ОДНО-СЕРИЙНЫЙ (навык dataviz): легенда не нужна — заголовок называет; одна краска-магнитуда
// (`--color-chart-1` / `--color-chart-2`), скруглённый верх столбика, спокойная сетка, tooltip по столбику.
// Дверь адресуется относительно пути страницы (закон 0), названия дней — из `Intl` по языку страницы.
type Row = Record<string, unknown>;
type DayPoint = { label: string; value: number };
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

  // Семь последних дней слева направо. Строку относим к дню по `createdAt` (момент захвата — факт), а не по
  // полю `date`, которое агент может переопределить.
  const { requests, values } = useMemo(() => {
    const count = new Map<string, number>();
    const sum = new Map<string, number>();
    for (const r of rows) {
      const iso = String(r.createdAt ?? r.date ?? "");
      const day = iso.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      count.set(day, (count.get(day) ?? 0) + 1);
      const chars = String(r.text ?? "").length;
      if (chars > 0) sum.set(day, (sum.get(day) ?? 0) + chars);
    }
    const weekday = new Intl.DateTimeFormat(lang, { weekday: "short" });
    const req: DayPoint[] = [];
    const val: DayPoint[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = dayKey(d);
      const label = weekday.format(d);
      req.push({ label, value: count.get(key) ?? 0 });
      val.push({ label, value: Math.round(sum.get(key) ?? 0) });
    }
    return { requests: req, values: val };
  }, [rows, lang]);

  const hasData = requests.some((d) => d.value > 0);
  const reqConfig = { value: { label: L.requestsTitle, color: "var(--color-chart-1)" } } satisfies ChartConfig;
  const valConfig = { value: { label: L.valueTitle, color: "var(--color-chart-2)" } } satisfies ChartConfig;

  return (
    <div className="space-y-4" data-entity-view="analytics">
      {loaded && !hasData ? <p className="text-sm text-muted-foreground">{L.empty}</p> : null}

      <section className="space-y-2 rounded-lg border p-3">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="size-4 text-muted-foreground" /> {L.requestsTitle}
        </h4>
        <ChartContainer config={reqConfig} className="aspect-auto h-48 w-full">
          <BarChart data={requests} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeOpacity={0.2} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ChartContainer>
      </section>

      <section className="space-y-2 rounded-lg border p-3">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <AlignLeft className="size-4 text-muted-foreground" /> {L.valueTitle}
        </h4>
        <ChartContainer config={valConfig} className="aspect-auto h-48 w-full">
          <BarChart data={values} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeOpacity={0.2} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} />
            <YAxis tickLine={false} axisLine={false} width={48} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ChartContainer>
      </section>
    </div>
  );
}
