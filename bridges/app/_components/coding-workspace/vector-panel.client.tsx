"use client";

import { useState, useEffect } from "react";
import { X, BrainCircuit, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Status = {
  configured: boolean;
  model: string;
  dims: number;
  indexed: boolean;
  count: number;
  reachable?: boolean;
};

type Hit = {
  id: string;
  collection: string;
  refTable?: string | null;
  refId?: string | null;
  text: string;
  score: number;
};

// Vector memory panel (step 500) — the third warehouse of the data layer, next to
// rows (Database) and objects (Upload object). It replaced LightRAG: the vectors now
// live inside the data service (:3300), in the same SQLite file as the rows they
// annotate, so there is no separate service to embed here — only its status and a
// search box that proves it answers.
//
// Layout follows the REFERENCE LAYOUT of users-panel / media-library-panel: the shell
// wrapper pins the panel to the top of the workspace and to the footer across the full
// width, and the panel itself only says `h-full w-full` — no fixed height, no fixed width.
export function VectorPanel({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetch("/api/config/embeddings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStatus(d))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const r = await fetch("/api/vectors/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, k: 5 }),
      });
      const d = await r.json();
      setHits(Array.isArray(d.results) ? d.results : []);
    } catch {
      setHits([]);
    } finally {
      setSearching(false);
    }
  }

  // One horizontal row of compact readings instead of a vertical <dl>: on the full
  // width of the workspace a two-column list drags the eye down for nothing.
  const metrics: { label: string; value: React.ReactNode }[] = status
    ? [
        {
          label: "embeddings key",
          value: (
            <span className={status.configured ? "text-green-600 dark:text-green-400" : "text-orange-500"}>
              {status.configured ? "set" : "not set"}
            </span>
          ),
        },
        { label: "model", value: <span className="text-foreground">{status.model}</span> },
        { label: "dimensions", value: <span className="text-foreground">{status.dims}</span> },
        { label: "search", value: <span className="text-foreground">{status.indexed ? "sqlite-vec index" : "linear scan"}</span> },
        { label: "records", value: <span className="text-foreground">{status.count}</span> },
      ]
    : [];

  return (
    <div className="flex flex-col h-full w-full bg-background border-t border-border">

      {/* ── Header ── */}
      <div className="flex items-center px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <BrainCircuit size={13} />
          Vector memory
          <span className="ml-1 text-[10px] font-normal text-muted-foreground font-mono">data service · :3300</span>
        </span>
        <span className="flex-1" />
        {status && (
          <span className="text-[10px] text-muted-foreground font-mono mr-3">
            {status.count} record{status.count === 1 ? "" : "s"}
          </span>
        )}
        <Button variant="ghost" size="icon-xs" onClick={onClose}>
          <X size={13} />
        </Button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground text-xs">
          <Loader2 size={13} className="animate-spin" />Loading…
        </div>
      ) : !status ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-[11px] text-muted-foreground text-center">The data service did not answer.</p>
        </div>
      ) : (
        <>
          {/* ── Status strip ── */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2 border-b border-border shrink-0 text-[11px] font-mono">
            {metrics.map((m) => (
              <span key={m.label} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-muted-foreground">{m.label}</span>
                {m.value}
              </span>
            ))}
          </div>

          {!status.configured && (
            <div className="px-4 py-2 border-b border-border shrink-0">
              <p className="rounded-md border border-orange-500/30 bg-orange-500/5 px-2.5 py-2 text-[10px] leading-relaxed text-orange-700 dark:text-orange-300">
                Paste an OpenAI key in <strong>OpenAI settings</strong> — without it text cannot be turned
                into vectors, and both writing and searching answer with an honest error.
              </p>
            </div>
          )}

          {/* ── Search by meaning: kept narrow on purpose — a full-width input is unreadable ── */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border shrink-0">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">Search by meaning</span>
            <div className="flex items-center gap-1.5 w-full max-w-md">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                placeholder="what are you looking for?"
                className="h-7 text-[11px] font-mono"
              />
              <Button size="xs" onClick={handleSearch} disabled={searching || !query.trim()}>
                {searching ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />}
                Search
              </Button>
            </div>
            {hits !== null && (
              <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                {hits.length} match{hits.length === 1 ? "" : "es"}
              </span>
            )}
          </div>

          {/* ── Results ── */}
          <div className="flex-1 overflow-auto">
            {hits === null ? (
              <div className="flex items-center justify-center h-full text-[11px] text-muted-foreground px-6 text-center">
                Ask the warehouse a question — the closest records answer here.
              </div>
            ) : hits.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[11px] text-muted-foreground">
                Nothing found.
              </div>
            ) : (
              <table className="text-[11px] border-collapse" style={{ minWidth: "100%" }}>
                <thead>
                  <tr className="border-b border-border bg-muted/50 sticky top-0 z-[5]">
                    <th className="text-left px-3 py-2 font-mono font-medium text-muted-foreground whitespace-nowrap border-r border-border">score</th>
                    <th className="text-left px-3 py-2 font-mono font-medium text-muted-foreground whitespace-nowrap border-r border-border min-w-[120px]">collection</th>
                    <th className="text-left px-3 py-2 font-mono font-medium text-muted-foreground whitespace-nowrap border-r border-border min-w-[160px]">row</th>
                    <th className="text-left px-3 py-2 font-mono font-medium text-muted-foreground whitespace-nowrap border-r border-border w-full">text</th>
                  </tr>
                </thead>
                <tbody>
                  {hits.map((h) => (
                    <tr key={h.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-1.5 border-r border-border font-mono text-foreground whitespace-nowrap">
                        {h.score.toFixed(3)}
                      </td>
                      <td className="px-3 py-1.5 border-r border-border max-w-[160px]">
                        <span className="truncate font-mono block text-muted-foreground" title={h.collection}>{h.collection}</span>
                      </td>
                      <td className="px-3 py-1.5 border-r border-border max-w-[220px]">
                        {h.refTable ? (
                          <span className="truncate font-mono block text-muted-foreground" title={`${h.refTable} · ${h.refId ?? ""}`}>
                            {h.refTable}<span className="text-muted-foreground/40"> · </span>{h.refId ?? "—"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 font-mono">—</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 border-r border-border max-w-0">
                        <span className="truncate font-mono block text-foreground" title={h.text}>{h.text}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
