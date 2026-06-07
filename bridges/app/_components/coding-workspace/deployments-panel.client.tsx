"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, X, Star, GitBranch, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
  author: string | null;
  created_at: string;
};

type Props = { onClose: () => void };

function timeAgo(ts: string): string {
  const t = Date.parse(ts.includes("T") ? ts : ts.replace(" ", "T") + "Z");
  if (Number.isNaN(t)) return "—";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
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

  const th = "text-left px-3 py-2 text-muted-foreground font-medium whitespace-nowrap";
  const td = "px-3 py-2 whitespace-nowrap";

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

      {/* Search */}
      <div className="px-3 py-2 border-b border-border shrink-0">
        <Input
          placeholder="Search by commit, platform, model or page…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 text-[11px]"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[11px] text-muted-foreground px-6 text-center">
            No deployments yet. Hermes records a row here after each delegated change is deployed.
          </div>
        ) : (
          <table className="w-full text-[11px] border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className={th}>Result</th>
                <th className={th}>Commit</th>
                <th className={th}>Status</th>
                <th className={th}>Duration</th>
                <th className={th}>Env</th>
                <th className={th}>Project</th>
                <th className={th}>Source</th>
                <th className={th}>Created</th>
                <th className={th}>Author</th>
                <th className={th}>Tokens</th>
                <th className={th}>Platform</th>
                <th className={th}>Model</th>
                <th className={th}>Page</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className={td}>
                    <button type="button" onClick={() => openRating(d)} title="Click to change rating">
                      <Stars value={d.result} />
                    </button>
                  </td>
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
                  <td className={`${td} text-muted-foreground tabular-nums`}>{timeAgo(d.created_at)}</td>
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
        <span>{rows.length} deployments</span>
      </div>

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
