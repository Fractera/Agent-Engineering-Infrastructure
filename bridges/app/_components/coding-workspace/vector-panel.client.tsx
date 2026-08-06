"use client";

import { useState, useEffect } from "react";
import { X, BrainCircuit, Loader2, Search } from "lucide-react";

type Status = {
  configured: boolean;
  model: string;
  dims: number;
  indexed: boolean;
  count: number;
  reachable?: boolean;
};

type Hit = { id: string; collection: string; text: string; score: number };

// Vector memory panel (step 500) — the third warehouse of the data layer, next to
// rows (Database) and objects (Upload object). It replaced LightRAG: the vectors now
// live inside the data service (:3300), in the same SQLite file as the rows they
// annotate, so there is no separate service to embed here — only its status and a
// search box that proves it answers.
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

  return (
    <div className="flex flex-col w-full h-full bg-background border-r border-border shadow-xl">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
          <BrainCircuit size={13} />
          Vector memory
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 size={12} className="animate-spin" /> Loading…
          </div>
        ) : !status ? (
          <p className="text-[11px] text-muted-foreground">The data service did not answer.</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-y-1.5 text-[11px]">
              <dt className="text-muted-foreground">Embeddings key</dt>
              <dd className={status.configured ? "text-green-500" : "text-orange-500"}>
                {status.configured ? "set" : "not set"}
              </dd>
              <dt className="text-muted-foreground">Model</dt>
              <dd className="font-mono text-foreground">{status.model}</dd>
              <dt className="text-muted-foreground">Dimensions</dt>
              <dd className="font-mono text-foreground">{status.dims}</dd>
              <dt className="text-muted-foreground">Search</dt>
              <dd className="text-foreground">{status.indexed ? "sqlite-vec index" : "linear scan"}</dd>
              <dt className="text-muted-foreground">Records</dt>
              <dd className="font-mono text-foreground">{status.count}</dd>
            </dl>

            {!status.configured && (
              <p className="rounded-md border border-orange-500/30 bg-orange-500/5 p-2.5 text-[10px] leading-relaxed text-orange-700 dark:text-orange-300">
                Paste an OpenAI key in <strong>OpenAI settings</strong> — without it text cannot be turned
                into vectors, and both writing and searching answer with an honest error.
              </p>
            )}

            <div className="space-y-2">
              <p className="text-[11px] font-medium text-foreground">Search by meaning</p>
              <div className="flex gap-1.5">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                  placeholder="what are you looking for?"
                  className="flex-1 h-8 px-2.5 text-[11px] rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || !query.trim()}
                  className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-[11px] disabled:opacity-40"
                >
                  {searching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                </button>
              </div>
            </div>

            {hits !== null && (
              hits.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">Nothing found.</p>
              ) : (
                <ul className="space-y-2">
                  {hits.map((h) => (
                    <li key={h.id} className="rounded-md border border-border p-2.5">
                      <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                        <span className="font-mono truncate">{h.collection}</span>
                        <span className="font-mono shrink-0">{h.score.toFixed(3)}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-foreground leading-relaxed">{h.text}</p>
                    </li>
                  ))}
                </ul>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
