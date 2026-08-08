"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, X, RefreshCw, Download, CheckCircle2, XCircle, AlertTriangle, Clock, PanelRightOpen, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Deployment history — every press of Deploy, kept in the data layer.
//
// The list carries no logs: a hundred builds of compiler output is megabytes nobody asked for. The log
// of ONE run is fetched when that run is opened, and can be taken away as a file — an error is only
// useful somewhere else, in an editor or in an agent's prompt.

type Run = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  description: string;
  duration_ms: number | null;
  commit_hash: string | null;
  log_size?: number;
  log?: string;
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  COMPLETED:     <CheckCircle2 size={12} className="text-emerald-500" />,
  FAILED:        <XCircle size={12} className="text-destructive" />,
  HEALTH_FAILED: <AlertTriangle size={12} className="text-amber-500" />,
  RUNNING:       <Clock size={12} className="text-sky-500" />,
};

function when(iso: string): string {
  // SQLite stores UTC without a zone marker; saying so explicitly keeps the browser from reading it
  // as local time and showing a build that finished "in three hours".
  const d = new Date(iso.includes("T") ? iso : `${iso.replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function howLong(ms: number | null): string {
  if (!ms || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function DeployHistoryPanel({ onClose }: { onClose: () => void }) {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openRun, setOpenRun] = useState<Run | null>(null);
  const [loadingLog, setLoadingLog] = useState(false);
  // Two columns need width. Below 768px the log column would be about a finger wide, so the page
  // becomes one column — the list — and the log arrives as a drawer over it. Measured with matchMedia
  // rather than a prop: the panel is the only thing that cares, and it should not depend on a parent
  // remembering to pass a width down.
  const [wide, setWide] = useState(true);
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/deploy/history?limit=100", { cache: "no-store", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `${res.status}`);
      setRuns(data.runs ?? []);
      setError(null);
    } catch (e) {
      setError(String(e));
      setRuns([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openLog(run: Run) {
    setLoadingLog(true);
    try {
      const res = await fetch(`/api/deploy/history?id=${encodeURIComponent(run.id)}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `${res.status}`);
      setOpenRun(data.run ?? run);
      // On a narrow screen picking a run is also the request to see it — the drawer comes with it.
      if (!wide) setLogOpen(true);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoadingLog(false);
    }
  }

  function download(run: Run) {
    const blob = new Blob([run.log ?? ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deploy-${run.id}-${run.status.toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-background flex flex-col h-full w-full">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-foreground">Deployment history</span>
        <span className="text-[10px] text-muted-foreground">every build, with its log</span>
        <span className="flex-1" />
        <button type="button" onClick={load}
          className="flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw size={12} />
        </button>
        <button type="button" onClick={onClose}
          className="flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <X size={13} />
        </button>
      </div>

      <div className="flex-1 min-h-0 flex relative overflow-hidden">
        {/* Runs — half the page when there is room, the whole of it when there is not. */}
        <div className={`${wide ? "w-1/2 border-r border-border" : "w-full"} min-w-0 overflow-y-auto`}>
          {/* The way back to the log after the drawer was closed: without it a narrow screen could
              show a selected run with no visible way to look at it again. */}
          {!wide && openRun && (
            <button
              type="button"
              onClick={() => setLogOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/50 text-[11px] text-foreground hover:bg-muted transition-colors"
            >
              <PanelRightOpen size={12} />
              Show the log of the selected deployment
            </button>
          )}
          {runs === null ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs py-10">
              <Loader2 size={13} className="animate-spin" />Loading…
            </div>
          ) : error ? (
            <p className="text-[11px] text-destructive px-4 py-4">{error}</p>
          ) : runs.length === 0 ? (
            <p className="text-[11px] text-muted-foreground px-4 py-4">
              No deployments recorded yet. The next press of Deploy appears here.
            </p>
          ) : (
            runs.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => openLog(r)}
                className={`w-full text-left px-3 py-2 border-b border-border/60 hover:bg-muted transition-colors ${openRun?.id === r.id ? "bg-muted" : ""}`}
              >
                <span className="flex items-center gap-2">
                  {STATUS_ICON[r.status] ?? <Clock size={12} className="text-muted-foreground" />}
                  <span className="text-[11px] text-foreground flex-1 truncate">{r.description || "deploy"}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{howLong(r.duration_ms)}</span>
                </span>
                <span className="block text-[10px] text-muted-foreground/70 font-mono mt-0.5">
                  {when(r.started_at)} · {r.status.toLowerCase()}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Click-away for the drawer. Only on a narrow screen, and only while it is out. */}
        {!wide && logOpen && (
          <div className="absolute inset-0 bg-black/40 z-10" onClick={() => setLogOpen(false)} />
        )}

        {/* Log of the selected run. Wide: the right half of the page. Narrow: a drawer that slides in
            from the right across 90% of the width, leaving a strip of the list visible so it stays
            obvious what is underneath. */}
        <div
          className={wide
            ? "w-1/2 min-w-0 flex flex-col"
            : "absolute inset-y-0 right-0 z-20 flex flex-col bg-background border-l border-border shadow-2xl"}
          style={wide ? undefined : {
            width: "90%",
            transform: logOpen ? "translateX(0)" : "translateX(100%)",
            transition: "transform 260ms ease-in-out",
            visibility: logOpen ? "visible" : "hidden",
          }}
        >
          {!wide && (
            <button
              type="button"
              onClick={() => setLogOpen(false)}
              className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ChevronRight size={12} />Back to the list
            </button>
          )}
          {loadingLog ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs gap-2">
              <Loader2 size={13} className="animate-spin" />Loading log…
            </div>
          ) : !openRun ? (
            <div className="flex-1 flex items-center justify-center px-6">
              <p className="text-[11px] text-muted-foreground text-center">
                Pick a deployment to read its log.
              </p>
            </div>
          ) : (
            <>
              <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border">
                <span className="text-[10px] font-mono text-muted-foreground flex-1 truncate">
                  {openRun.id} · {openRun.status.toLowerCase()}
                </span>
                <Button variant="outline" size="sm" onClick={() => download(openRun)}>
                  <Download size={11} />Download
                </Button>
              </div>
              <div className="flex-1 min-h-0 overflow-auto bg-zinc-950 px-3 py-2">
                <pre className="text-[10px] font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {openRun.log?.trim() || "(this run recorded no log)"}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
