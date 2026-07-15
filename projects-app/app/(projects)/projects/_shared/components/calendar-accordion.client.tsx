"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { useUiLang } from "../use-ui-lang";
import { calendarStrings } from "../calendar-i18n";

// THE CALENDAR ACCORDION — visual logic adapted from `personal/telegram-notes`'s
// `calendar-section.client.tsx` (month grid left, 30-min daily planner right — LOGIC reference only, per
// [[feedback-telegram-notes-logic-source-only]], never its architecture): that automation reads its own
// bespoke `telegram_notes` SQL table; this component instead reads through the SAME generic rows store
// every OTHER accordion (Dashboard/History) already uses (`addRow`/`listRows`, table id "calendar") — a
// row's `values` carry {date:"YYYY-MM-DD", time:"HH:MM", title, type:"event"|"reminder"}.
//
// READ-ONLY for now (no ask/input box here yet — the interactive natural-language creation flow is a
// SEPARATE, later step): this is a static preview of whatever rows already exist for this automation
// (frozen-template automations are seeded with a couple of demo rows at creation, so it is never empty).
type CalRow = { id: string; date: string; time: string; title: string; type: "event" | "reminder" };
type Filter = "both" | "event" | "reminder";

const DAY_START = 7 * 60;
const DAY_END = 23 * 60;
const SLOT = 30;

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function toMinutes(time: string): number {
  const [h, m] = (time || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function slotLabel(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function CalendarAccordion({ automation }: { automation: string }) {
  const lang = useUiLang();
  const L = calendarStrings(lang);
  const locale = lang.slice(0, 2);
  const monthFmt = useMemo(() => new Intl.DateTimeFormat(locale, { month: "long" }), [locale]);
  const weekdayFmt = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "short" }), [locale]);

  const [rows, setRows] = useState<CalRow[]>([]);
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<string | null>(ymd(now.getFullYear(), now.getMonth(), now.getDate()));
  const [filter, setFilter] = useState<Filter>("both");

  useEffect(() => {
    let alive = true;
    fetch(`/api/projects/dashboard/rows?automation=${encodeURIComponent(automation)}&table=calendar&limit=500`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { rows?: { id: string; values: Record<string, unknown> }[] } | null) => {
        if (!alive) return;
        const out: CalRow[] = (d?.rows ?? [])
          .map((r) => ({
            id: r.id,
            date: String(r.values.date ?? ""),
            time: String(r.values.time ?? "00:00"),
            title: String(r.values.title ?? ""),
            type: r.values.type === "reminder" ? "reminder" as const : "event" as const,
          }))
          .filter((r) => r.date);
        setRows(out);
      })
      .catch(() => { /* empty calendar — a genuinely new automation with no rows yet */ });
    return () => { alive = false; };
  }, [automation]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalRow[]>();
    for (const e of rows) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [rows]);

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const out: Array<{ day: number; date: string } | null> = [];
    for (let i = 0; i < startOffset; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push({ day: d, date: ymd(view.y, view.m, d) });
    return out;
  }, [view]);

  const dayEntries = selected ? byDate.get(selected) ?? [] : [];
  const reminderCount = dayEntries.filter((e) => e.type === "reminder").length;
  const eventCount = dayEntries.filter((e) => e.type === "event").length;
  const shown = dayEntries.filter((e) => filter === "both" || e.type === filter);

  const slots = useMemo(() => {
    let start = DAY_START;
    let end = DAY_END;
    for (const e of shown) {
      const mn = toMinutes(e.time);
      start = Math.min(start, mn - (mn % SLOT));
      end = Math.max(end, mn - (mn % SLOT) + SLOT);
    }
    const out: Array<{ min: number; label: string; items: CalRow[] }> = [];
    for (let mn = start; mn < end; mn += SLOT) {
      const items = shown.filter((e) => {
        const t = toMinutes(e.time);
        return t >= mn && t < mn + SLOT;
      });
      out.push({ min: mn, label: slotLabel(mn), items });
    }
    return out;
  }, [shown]);

  function shift(delta: number) {
    setView((v) => {
      const m = v.m + delta;
      return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });
  }

  const weekdayLabels = useMemo(() => {
    // Monday-first, matching the month grid's own Mon=0 layout: 2024-01-01 was a Monday.
    return Array.from({ length: 7 }, (_, i) => weekdayFmt.format(new Date(2024, 0, 1 + i)));
  }, [weekdayFmt]);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <div>
          <p className="font-medium text-foreground">{L.instructionTitle}</p>
          <p>{L.instructionBody}</p>
        </div>
      </div>

      {!rows.length ? (
        <p className="text-sm text-muted-foreground">{L.emptyAutomation}</p>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="w-full rounded-lg border p-3 sm:w-[300px] sm:shrink-0">
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => shift(-1)} className="rounded p-1 hover:bg-muted" aria-label={L.prevMonth}>
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-sm font-medium capitalize">
                {monthFmt.format(new Date(view.y, view.m, 1))} {view.y}
              </span>
              <button type="button" onClick={() => shift(1)} className="rounded p-1 hover:bg-muted" aria-label={L.nextMonth}>
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] capitalize text-muted-foreground">
              {weekdayLabels.map((w, i) => (
                <div key={i} className="py-0.5">{w}</div>
              ))}
            </div>
            <div className="mt-0.5 grid grid-cols-7 gap-0.5 text-center text-xs">
              {cells.map((c, i) => {
                if (!c) return <div key={i} />;
                const list = byDate.get(c.date);
                const hasEvent = !!list?.some((e) => e.type === "event");
                const hasReminder = !!list?.some((e) => e.type === "reminder");
                const isSel = c.date === selected;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelected(c.date)}
                    className={`relative aspect-square rounded hover:bg-muted ${isSel ? "bg-primary text-primary-foreground" : ""}`}
                  >
                    {c.day}
                    {(hasEvent || hasReminder) && (
                      <span className="absolute bottom-0.5 left-1/2 flex -translate-x-1/2 gap-0.5">
                        {hasEvent && <span className="size-1 rounded-full bg-blue-500" />}
                        {hasReminder && <span className="size-1 rounded-full bg-amber-500" />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-full rounded-lg border p-3 sm:flex-1">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{selected ?? L.pickDate}</p>
              <span className="text-xs text-muted-foreground">
                {reminderCount} {L.reminderCountLabel} · {eventCount} {L.eventCountLabel}
              </span>
            </div>
            <div className="mb-3 flex gap-1">
              {([
                { key: "both" as const, label: L.filterAll },
                { key: "event" as const, label: L.filterEvents },
                { key: "reminder" as const, label: L.filterReminders },
              ]).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`rounded px-2 py-0.5 text-xs ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {shown.length === 0 ? (
              <p className="text-xs text-muted-foreground">{L.emptyDay}</p>
            ) : (
              <div className="divide-y">
                {slots.map((s) => (
                  <div key={s.min} className="flex min-h-7 items-start gap-2 py-1">
                    <span className="w-10 shrink-0 font-mono text-[11px] leading-5 text-muted-foreground">{s.label}</span>
                    <div className="flex-1 space-y-1">
                      {s.items.map((e) => (
                        <div
                          key={e.id}
                          className={`rounded px-2 py-1 text-sm ${e.type === "event" ? "bg-blue-500/10 text-blue-700 dark:text-blue-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}
                        >
                          <span className="font-mono text-[11px] opacity-70">{e.time}</span>{" "}
                          <span className="text-[10px] uppercase opacity-60">
                            {e.type === "event" ? L.typeEvent : L.typeReminder}
                          </span>{" "}
                          — {e.title}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
