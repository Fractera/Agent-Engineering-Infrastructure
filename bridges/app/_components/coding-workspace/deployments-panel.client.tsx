"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, X, Star, GitBranch, ExternalLink, ChevronUp, ChevronDown, FolderGit2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ProjectsModal } from "./projects-modal.client";

type Deployment = {
  id: string;
  result: number;
  project: string;
  tokens: number;
  platform: string | null;
  model: string | null;
  page_url: string | null;
  commit_message: string | null;
  status: string;
  duration_ms: number | null;
  commit_hash: string | null;
  branch: string | null;
  step: string | null;
  author: string | null;
  created_at: string;
};

type Props = { onClose: () => void };
type SortDir = "asc" | "desc";

// Stored as "YYYY-MM-DD HH:MM:SS" (UTC) → show dd-mm-yy hh:mm:ss.
function fmtCreated(ts: string): string {
  const m = ts.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return ts;
  const [, Y, Mo, D, h, mi, s] = m;
  return `${D}-${Mo}-${Y.slice(2)} ${h}:${mi}:${s}`;
}

function fmtDuration(ms: number | null): string {
  if (!ms || ms <= 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function fmtTokens(n: number): string {
  if (!n) return "0";
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

function statusColor(status: string): string {
  if (status === "error") return "bg-red-500";
  if (status === "building") return "bg-amber-500";
  return "bg-cyan-500"; // ready — Vercel "geist-cyan"
}

// Columns in display order. `sortKey` is the Deployment field used for sorting.
const COLS: { key: string; label: string; sortKey: keyof Deployment; num?: boolean }[] = [
  { key: "result",         label: "Result",   sortKey: "result", num: true },
  { key: "created",        label: "Created",  sortKey: "created_at" },
  { key: "step",           label: "Step",     sortKey: "step" },
  { key: "commit_message", label: "Commit",   sortKey: "commit_message" },
  { key: "status",         label: "Status",   sortKey: "status" },
  { key: "duration",       label: "Duration", sortKey: "duration_ms", num: true },
  { key: "env",            label: "Env",      sortKey: "status" },
  { key: "project",        label: "Project",  sortKey: "project" },
  { key: "source",         label: "Source",   sortKey: "commit_hash" },
  { key: "author",         label: "Author",   sortKey: "author" },
  { key: "tokens",         label: "Tokens",   sortKey: "tokens", num: true },
  { key: "platform",       label: "Platform", sortKey: "platform" },
  { key: "model",          label: "Model",    sortKey: "model" },
  { key: "page",           label: "Page",     sortKey: "page_url" },
];

function Stars({ value, onPick, size = 13 }: { value: number; onPick?: (n: number) => void; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          size={size}
          onClick={onPick ? () => onPick(n) : undefined}
          className={
            (n <= value ? "text-amber-400 fill-amber-400" : "text-muted-foreground/40") +
            (onPick ? " cursor-pointer hover:scale-110 transition-transform" : "")
          }
        />
      ))}
    </span>
  );
}

export function DeploymentsPanel({ onClose }: Props) {
  const [rows, setRows] = useState<Deployment[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<Deployment | null>(null);
  const [pick, setPick] = useState(3);
  const [saving, setSaving] = useState(false);

  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [sortField, setSortField] = useState<keyof Deployment>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const fetchRows = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      const res = await fetch(`/api/deployments?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setRows(data.rows ?? []);
    } catch {
      toast.error("Failed to load deployments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(""); }, [fetchRows]);

  useEffect(() => {
    const t = setTimeout(() => fetchRows(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchRows]);

  // Client-side project filter + column sort over the fetched rows.
  const view = useMemo(() => {
    let v = projectFilter.length ? rows.filter((r) => projectFilter.includes(r.project)) : rows;
    v = [...v].sort((a, b) => {
      const col = COLS.find((c) => c.sortKey === sortField);
      const va = a[sortField], vb = b[sortField];
      let r: number;
      if (col?.num) r = (Number(va) || 0) - (Number(vb) || 0);
      else r = String(va ?? "").localeCompare(String(vb ?? ""));
      return sortDir === "asc" ? r : -r;
    });
    return v;
  }, [rows, projectFilter, sortField, sortDir]);

  function applySort(field: keyof Deployment, dir: SortDir) {
    setSortField(field);
    setSortDir(dir);
  }

  function reset() {
    setSearch("");
    setProjectFilter([]);
    setSortField("created_at");
    setSortDir("desc");
  }

  function openRating(d: Deployment) {
    setRating(d);
    setPick(d.result || 3);
  }

  async function saveRating() {
    if (!rating) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/deployments/${rating.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ result: pick }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setRows((prev) => prev.map((r) => (r.id === rating.id ? { ...r, result: pick } : r)));
      setRating(null);
      toast.success("Rating saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save rating");
    } finally {
      setSaving(false);
    }
  }

  const td = "px-3 py-2 whitespace-nowrap";
  const filterActive = projectFilter.length > 0 || !!search || sortField !== "created_at" || sortDir !== "desc";

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Deployments</span>
          <span className="text-[10px] text-muted-foreground">
            How the project is built — agent, model, tokens and your rating
          </span>
        </div>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Toolbar: search · projects filter · reset */}
      <div className="px-3 py-2 border-b border-border shrink-0 flex items-center gap-2">
        <Input
          placeholder="Search commit, platform, model or page…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 text-[11px] flex-1"
        />
        <Button variant="outline" size="sm" className="h-7 text-[11px] shrink-0 gap-1.5" onClick={() => setProjectsOpen(true)}>
          <FolderGit2 size={12} />
          {projectFilter.length ? `Projects · ${projectFilter.length}` : "Projects"}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-[11px] shrink-0 gap-1.5" onClick={reset} disabled={!filterActive} title="Reset filters, search and sort">
          <RotateCcw size={12} />Reset
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        ) : view.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[11px] text-muted-foreground px-6 text-center">
            {rows.length === 0
              ? "No deployments yet. Hermes records a row here after each delegated change is deployed."
              : "No deployments match the current filter."}
          </div>
        ) : (
          <table className="w-full text-[11px] border-collapse min-w-[1100px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {COLS.map((c) => {
                  const activeUp = sortField === c.sortKey && sortDir === "asc";
                  const activeDown = sortField === c.sortKey && sortDir === "desc";
                  return (
                    <th key={c.key} className="text-left px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        {c.label}
                        <span className="inline-flex flex-col -space-y-1">
                          <button type="button" onClick={() => applySort(c.sortKey, "asc")}
                            className={activeUp ? "text-foreground" : "text-muted-foreground/40 hover:text-muted-foreground"}>
                            <ChevronUp size={11} />
                          </button>
                          <button type="button" onClick={() => applySort(c.sortKey, "desc")}
                            className={activeDown ? "text-foreground" : "text-muted-foreground/40 hover:text-muted-foreground"}>
                            <ChevronDown size={11} />
                          </button>
                        </span>
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {view.map((d) => (
                <tr key={d.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className={td}>
                    <button type="button" onClick={() => openRating(d)} title="Click to change rating">
                      <Stars value={d.result} />
                    </button>
                  </td>
                  <td className={`${td} tabular-nums text-muted-foreground`}>{fmtCreated(d.created_at)}</td>
                  <td className={`${td} text-muted-foreground`}>{d.step ?? "—"}</td>
                  <td className={`${td} font-medium max-w-[220px] truncate`} title={d.commit_message ?? ""}>
                    {d.commit_message ?? "—"}
                  </td>
                  <td className={td}>
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${statusColor(d.status)}`} />
                      <span className="capitalize">{d.status}</span>
                    </span>
                  </td>
                  <td className={`${td} tabular-nums text-muted-foreground`}>{fmtDuration(d.duration_ms)}</td>
                  <td className={td}>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-medium">
                      Production
                    </span>
                  </td>
                  <td className={`${td} text-muted-foreground`}>{d.project}</td>
                  <td className={`${td} font-mono text-muted-foreground`}>
                    <span className="inline-flex items-center gap-1.5">
                      {d.commit_hash ? <span>{d.commit_hash.slice(0, 7)}</span> : null}
                      {d.branch ? (
                        <span className="inline-flex items-center gap-1">
                          <GitBranch size={10} />{d.branch}
                        </span>
                      ) : null}
                      {!d.commit_hash && !d.branch ? "—" : null}
                    </span>
                  </td>
                  <td className={td}>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[9px] uppercase">
                        {(d.author ?? "H").slice(0, 1)}
                      </span>
                      <span className="text-muted-foreground">{d.author ?? "Hermes"}</span>
                    </span>
                  </td>
                  <td className={`${td} tabular-nums`}>{fmtTokens(d.tokens)}</td>
                  <td className={`${td} text-muted-foreground`}>{d.platform ?? "—"}</td>
                  <td className={`${td} text-muted-foreground`}>{d.model ?? "—"}</td>
                  <td className={td}>
                    {d.page_url ? (
                      <a href={d.page_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-500 hover:underline max-w-[200px] truncate">
                        <ExternalLink size={10} className="shrink-0" />
                        <span className="truncate">{d.page_url.replace(/^https?:\/\//, "")}</span>
                      </a>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer count */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border text-[11px] text-muted-foreground shrink-0">
        <span>{view.length}{view.length !== rows.length ? ` / ${rows.length}` : ""} deployments</span>
      </div>

      {/* Projects modal (filter + add) */}
      <ProjectsModal
        open={projectsOpen}
        onClose={() => setProjectsOpen(false)}
        selected={projectFilter}
        onChange={setProjectFilter}
      />

      {/* Rating modal */}
      <Dialog open={!!rating} onOpenChange={(o) => { if (!o) setRating(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Rate this deployment</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            <Stars value={pick} onPick={setPick} size={28} />
            <span className="text-[11px] text-muted-foreground">
              {pick} of 3 — {pick === 3 ? "excellent" : pick === 2 ? "ok" : "needs work"}
            </span>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setRating(null)}>
              Cancel
            </Button>
            <Button size="sm" className="h-7 text-[11px]" onClick={saveRating} disabled={saving}>
              {saving ? <Loader2 size={11} className="animate-spin mr-1" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
