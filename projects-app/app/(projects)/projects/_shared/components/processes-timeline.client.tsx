"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Play, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// THE PROCESSES / Gantt TIMELINE (step 230) — the hardest node. Shown ONLY for automations that have forks
// (Instances, 223.C.4). Every FORK is a ROW (~32px); its bar length is the sum of its nodes' estimated
// process times; inside the bar the NODES are nested bars (~28px). The whole space scrolls left→right; a
// live "now" line marks the current time to the minute; hovering a node/fork shows when it activates. A
// click on a bar scrolls up to the Instances panel. The estimate is refined against reality: a run that
// finishes early/late shifts the plan (the server recomputes; here we just re-fetch every minute and move
// the now-line every second).
type SNode = { name: string; startMs: number; durationMs: number; status: "done" | "running" | "pending" };
type SRow = {
  instanceId: string; title: string; ord: number;
  plannedStart: number; plannedDurationMs: number;
  actualStart: number | null; actualEnd: number | null; status: string; nodes: SNode[];
};

const ROW_H = 40;         // one fork row
const NODE_H = 28;        // a node bar inside the fork bar
const LABEL_W = 160;      // left gutter with the fork title
const MIN_SCALE = 0.00002; // px per ms floor (so multi-day forks still fit); adjusted to content below

const STATUS_BAR: Record<string, string> = {
  done: "bg-emerald-500/25 border-emerald-500",
  running: "bg-orange-500/25 border-orange-500",
  scheduled: "bg-primary/15 border-primary/50",
};

function fmt(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

export function ProcessesTimeline({ automation }: { automation: string }) {
  const [rows, setRows] = useState<SRow[] | null>(null);
  const [now, setNow] = useState(Date.now());
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);
  const [zoom, setZoom] = useState(1); // 1 = auto-fit; "+" doubles the px per second, "−" halves it
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/projects/schedule?automation=${encodeURIComponent(automation)}`, { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { rows: SRow[]; now: number };
      setRows(d.rows ?? []);
      setNow(d.now ?? Date.now());
    } catch { /* keep last */ }
  }, [automation]);

  useEffect(() => {
    void load();
    // Poll every 3s so nodes turn green live as the run advances (the runner is driven server-side).
    const data = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 3000);
    return () => clearInterval(data);
  }, [load]);

  // Move the "now" line every second (client clock advances between the minute re-fetches).
  useEffect(() => {
    const t = setInterval(() => setNow((n) => n + 1000), 1000);
    return () => clearInterval(t);
  }, []);

  // The time window: from the earliest planned/actual start to the latest end, padded.
  const bounds = useMemo(() => {
    if (!rows || !rows.length) return null;
    let min = Infinity, max = -Infinity;
    for (const r of rows) {
      const s = Math.min(r.plannedStart, r.actualStart ?? r.plannedStart);
      const e = Math.max((r.actualEnd ?? r.plannedStart + r.plannedDurationMs), r.plannedStart + r.plannedDurationMs);
      min = Math.min(min, s); max = Math.max(max, e);
    }
    min = Math.min(min, now); max = Math.max(max, now);
    const span = Math.max(max - min, 60000);
    return { min: min - span * 0.05, max: max + span * 0.05 };
  }, [rows, now]);

  // The zoom (owner): "+" doubles the space one second takes, "−" halves it. It multiplies the auto-fit
  // scale, so the timeline still fits by default and the buttons stretch/squeeze it from there.
  const scale = useMemo(() => {
    if (!bounds) return MIN_SCALE * zoom;
    const targetPx = 1200; // auto-fit ~1200px, then let it scroll
    const fit = (bounds.max - bounds.min) === 0 ? MIN_SCALE : targetPx / (bounds.max - bounds.min);
    return Math.max(fit, MIN_SCALE) * zoom;
  }, [bounds, zoom]);

  const xOf = useCallback((ms: number) => (bounds ? (ms - bounds.min) * scale : 0), [bounds, scale]);

  // Run / Reset (step 230) — the owner controls WHEN the timeline starts. "Run" clears prior runs and starts
  // the first fork (the queue chains on); "Reset" drops all runs back to the plan. The runner never
  // cold-starts on its own, so a reset timeline waits here until "Run".
  const control = useCallback(async (action: "run" | "reset") => {
    const r = await fetch(`/api/projects/schedule/control`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ automation, action }),
    });
    if (!r.ok) { toast.error("Could not " + action + " the timeline."); return; }
    toast.success(action === "run" ? "Timeline started — forks run one by one." : "Timeline reset to the plan.");
    await load();
  }, [automation, load]);

  // Clicking a bar focuses the DIAGRAM (the automation's centerpiece, at the top): scroll up to it and title
  // it with the clicked node — the word "Diagram", the node name, and its planned start/end (step 230, owner).
  const focusDiagram = useCallback((name: string, startMs: number, endMs: number) => {
    window.dispatchEvent(new CustomEvent("processes:focus-node", { detail: { automation, name, startMs, endMs } }));
    document.getElementById("diagram-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [automation]);

  if (rows === null) return <p className="text-sm text-muted-foreground">Loading the timeline…</p>;
  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No forks yet — the timeline appears once this automation has Instances (fork the Master in the
        Instances panel). Each fork becomes a row here, laid out by its estimated duration.
      </p>
    );
  }

  const width = bounds ? Math.max(xOf(bounds.max) + LABEL_W + 40, 800) : 800;
  const nowX = xOf(now) + LABEL_W;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Each row is a fork; its bar is its duration (the nodes run in sequence). The vertical line is now.
          Click a bar to open its diagram. Nodes turn green as they finish; forks run one by one.
        </p>
        <div className="flex items-center gap-2">
          {/* Zoom (owner): "+" doubles the space one second takes; "−" halves it. */}
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="size-8" aria-label="Zoom out" title="Squeeze the time scale (half the pixels per second)" onClick={() => setZoom((z) => Math.max(z / 2, 1 / 64))}>
              <Minus className="size-3.5" />
            </Button>
            <span className="w-10 text-center text-xs tabular-nums text-muted-foreground" title="Time scale">
              {zoom >= 1 ? `${zoom}x` : `1/${Math.round(1 / zoom)}x`}
            </span>
            <Button size="icon" variant="outline" className="size-8" aria-label="Zoom in" title="Stretch the time scale (double the pixels per second)" onClick={() => setZoom((z) => Math.min(z * 2, 64))}>
              <Plus className="size-3.5" />
            </Button>
          </div>
          <Button size="sm" onClick={() => void control("run")}>
            <Play className="size-3.5" /> Run
          </Button>
          <Button size="sm" variant="outline" onClick={() => void control("reset")}>
            <RotateCcw className="size-3.5" /> Reset
          </Button>
        </div>
      </div>
      <div ref={scrollRef} className="relative overflow-x-auto rounded-lg border bg-muted/20">
        <div className="relative" style={{ width, height: rows.length * ROW_H + 28 }}>
          {/* time axis (top) */}
          <div className="sticky top-0 h-6 border-b bg-background/80 text-[10px] text-muted-foreground">
            {bounds &&
              Array.from({ length: 6 }).map((_, i) => {
                const t = bounds.min + ((bounds.max - bounds.min) * i) / 5;
                return (
                  <span key={i} className="absolute top-1 -translate-x-1/2 whitespace-nowrap" style={{ left: xOf(t) + LABEL_W }}>
                    {fmt(t)}
                  </span>
                );
              })}
          </div>

          {/* the NOW line */}
          <div className="absolute bottom-0 top-6 w-px bg-red-500" style={{ left: nowX }} title={`now: ${fmt(now)}`}>
            <span className="absolute -top-0 left-1 text-[10px] font-medium text-red-500">now</span>
          </div>

          {/* fork rows */}
          {rows.map((r, i) => {
            const top = 28 + i * ROW_H;
            const barLeft = xOf(r.plannedStart) + LABEL_W;
            const barW = Math.max(r.plannedDurationMs * scale, 2);
            return (
              <div key={r.instanceId} className="absolute left-0" style={{ top, height: ROW_H, width }}>
                <span className="absolute left-2 top-2 w-[150px] truncate text-xs font-medium" title={r.title}>
                  {r.title}
                </span>
                {/* the fork bar — click focuses the diagram on the fork's whole window */}
                <button
                  type="button"
                  onClick={() => focusDiagram(r.title, r.plannedStart, r.plannedStart + r.plannedDurationMs)}
                  onMouseEnter={(e) => setHover({ x: e.clientX, y: e.clientY, text: `${r.title} — activates ${fmt(r.plannedStart)}` })}
                  onMouseLeave={() => setHover(null)}
                  className={"absolute overflow-hidden rounded border " + (STATUS_BAR[r.status] ?? STATUS_BAR.scheduled)}
                  style={{ left: barLeft, top: 4, width: barW, height: ROW_H - 8 }}
                  title={`${r.title} — click to open its diagram`}
                >
                  {/* nested node bars */}
                  {r.nodes.map((n, j) => {
                    const nLeft = xOf(n.startMs) - xOf(r.plannedStart);
                    const nW = Math.max(n.durationMs * scale, 1);
                    return (
                      <span
                        key={j}
                        role="button"
                        className={"absolute top-1 flex items-center overflow-hidden rounded-sm border text-[9px] " + (
                          n.status === "done" ? "border-emerald-500 bg-emerald-500/40"
                          : n.status === "running" ? "border-orange-500 bg-orange-500/40"
                          : "border-foreground/20 bg-background/70"
                        )}
                        style={{ left: nLeft, width: nW, height: NODE_H - 6 }}
                        onClick={(e) => { e.stopPropagation(); focusDiagram(n.name, n.startMs, n.startMs + n.durationMs); }}
                        onMouseEnter={(e) => { e.stopPropagation(); setHover({ x: e.clientX, y: e.clientY, text: `${n.name} — activates ${fmt(n.startMs)}` }); }}
                        onMouseLeave={() => setHover(null)}
                        title={`${n.name} — activates ${fmt(n.startMs)}`}
                      >
                        <span className="truncate px-1">{n.name}</span>
                      </span>
                    );
                  })}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {hover && (
        <div
          className="pointer-events-none fixed z-50 rounded bg-foreground px-2 py-1 text-xs text-background shadow"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          {hover.text}
        </div>
      )}
    </div>
  );
}
