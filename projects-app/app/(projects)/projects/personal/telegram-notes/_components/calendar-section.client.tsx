"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarEvent } from "../_lib/project-data";

// Calendar section (step 205 §H, redesigned step 207.5): a month calendar (left, 300px) whose dates with
// entries are marked by type, and a DAILY PLANNER (right) — a 30-minute timeline for the selected date.
// Header of the planner: the day's reminder counter + 3 filters (events / reminders / both, default both).
// Colors distinguish an event (blue) from a reminder (amber). Self-contained plain grid, NO external dep;
// with JavaScript off the current-month marks still render (interactivity degrades, not the data).
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_START = 7 * 60; // planner default window 07:00–23:00; expands to include out-of-window entries
const DAY_END = 23 * 60;
const SLOT = 30; // minutes per timeline slot

type Filter = "both" | "event" | "reminder";

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function slotLabel(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function CalendarSection({ events }: { events: CalendarEvent[] }) {
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<string | null>(ymd(now.getFullYear(), now.getMonth(), now.getDate()));
  const [filter, setFilter] = useState<Filter>("both");

  // date → entries; plus which types each date has (for the two-color month marks).
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [events]);

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const startOffset = (first.getDay() + 6) % 7; // Mon=0
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

  // Build the 30-min planner slots for the selected day. Window = the default 07:00–23:00 stretched to
  // cover any entry outside it, so an early/late reminder is never hidden. Each slot holds the entries
  // whose time falls inside it (the slot row grows with its entries).
  const slots = useMemo(() => {
    let start = DAY_START;
    let end = DAY_END;
    for (const e of shown) {
      const mn = toMinutes(e.time);
      start = Math.min(start, mn - (mn % SLOT));
      end = Math.max(end, mn - (mn % SLOT) + SLOT);
    }
    const out: Array<{ min: number; label: string; items: CalendarEvent[] }> = [];
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

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      {/* Left: month calendar — 300px wide, height fits content */}
      <div className="w-full rounded-lg border p-3 sm:w-[300px] sm:shrink-0">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" onClick={() => shift(-1)} className="rounded p-1 hover:bg-muted" aria-label="Previous month">
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-medium">{MONTHS[view.m]} {view.y}</span>
          <button type="button" onClick={() => shift(1)} className="rounded p-1 hover:bg-muted" aria-label="Next month">
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-muted-foreground">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-0.5">{w}</div>
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

      {/* Right: daily planner for the selected date — timeline of 30-min slots */}
      <div className="w-full rounded-lg border p-3 sm:flex-1">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">{selected ?? "Pick a date"}</p>
          <span className="text-xs text-muted-foreground">
            {reminderCount} reminder{reminderCount === 1 ? "" : "s"} · {eventCount} event{eventCount === 1 ? "" : "s"}
          </span>
        </div>
        {/* Filters: events / reminders / both (default both) */}
        <div className="mb-3 flex gap-1">
          {(["both", "event", "reminder"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded px-2 py-0.5 text-xs capitalize ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
            >
              {f === "both" ? "All" : f === "event" ? "Events" : "Reminders"}
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <p className="text-xs text-muted-foreground">No {filter === "both" ? "entries" : `${filter}s`} on this date.</p>
        ) : (
          <div className="divide-y">
            {slots.map((s) => (
              <div key={s.min} className="flex min-h-7 items-start gap-2 py-1">
                <span className="w-10 shrink-0 font-mono text-[11px] leading-5 text-muted-foreground">{s.label}</span>
                <div className="flex-1 space-y-1">
                  {s.items.map((e, i) => (
                    <div
                      key={i}
                      className={`rounded px-2 py-1 text-sm ${e.type === "event" ? "bg-blue-500/10 text-blue-700 dark:text-blue-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}
                    >
                      <span className="font-mono text-[11px] opacity-70">{e.time}</span>{" "}
                      <span className="text-[10px] uppercase opacity-60">{e.type}</span> — {e.title}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
