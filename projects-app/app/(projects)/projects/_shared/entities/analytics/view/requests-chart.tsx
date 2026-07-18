"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// 🔒 ARCHITECTURE LOCK (ROUTE-V3 law 3 — breaking this breaks the whole chain, FORBIDDEN):
// VIEW file — never import admin/ or another entity. Enforced by `npm run check:entity-imports`.
//
// THE ANALYTICS — VIEW CORE (step 254.8b, owner's spec): ONE bar chart in the shadcn/charts style —
// how many requests were made each day, counted from the REAL History rows (two lookups on Monday →
// a bar of 2; none on Tuesday → no bar; one on Wednesday → 1). Last 14 days, newest right.
type DayCount = { day: string; requests: number };

export function RequestsPerDayChart({ automation }: { automation: string }) {
  const [rows, setRows] = useState<{ values: Record<string, unknown> }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/projects/dashboard/rows?automation=${encodeURIComponent(automation)}&table=history&limit=500`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { rows?: { values: Record<string, unknown> }[]; source?: string } | null) => {
        if (!alive) return;
        setRows(d?.source === "live" ? d.rows ?? [] : []);
        setLoaded(true);
      })
      .catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [automation]);

  const data = useMemo<DayCount[]>(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const raw = String(r.values.date ?? "");
      const day = raw.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(day)) counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    const out: DayCount[] = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      out.push({ day: key.slice(5), requests: counts.get(key) ?? 0 });
    }
    return out;
  }, [rows]);

  const total = data.reduce((s, d) => s + d.requests, 0);

  return (
    <div className="space-y-2" data-analytics-view="requests-chart">
      <div className="h-56 w-full rounded-lg border p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeOpacity={0.2} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={10} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={10} />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              contentStyle={{
                background: "var(--background)", border: "1px solid var(--border)",
                borderRadius: 8, fontSize: 12,
              }}
            />
            <Bar dataKey="requests" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground">
        {loaded && total === 0
          ? "No requests recorded yet — the chart fills as the automation is used."
          : `Requests per day, counted from the live History rows (${total} in the last 14 days).`}
      </p>
    </div>
  );
}
