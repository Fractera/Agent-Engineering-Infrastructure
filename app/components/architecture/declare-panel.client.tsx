"use client"

import { useState } from "react"
import { Plus, X, Loader2 } from "lucide-react"
import { projectApi } from "@/lib/architecture/project-api"
import { SourceExample } from "./source-example.client"
import type { Requested, QueryParam } from "@/lib/architecture/requested-tree"

// Two-state segmented toggle. We declare intent here (a spec for the agent), so
// these are plain choices, not real config.
function SegToggle({ off, on, value, onChange }: {
  off: string; on: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border text-[11px] font-semibold">
      {[[false, off], [true, on]].map(([v, label]) => (
        <button
          key={String(v)}
          onClick={() => onChange(v as boolean)}
          className={`px-2.5 py-1 transition-colors ${
            value === v ? "bg-foreground text-background" : "text-foreground/70 hover:bg-muted"
          }`}
        >
          {label as string}
        </button>
      ))}
    </div>
  )
}

// The right-side panel opened by "Add page". Declares a requested route — static
// or dynamic, with optional query params — as a spec for the agent. Duplicates
// don't matter (the agent resolves them); nothing is built here.
export function DeclarePanel({
  base = "/",
  onClose,
  onCreated,
}: {
  base?: string
  onClose: () => void
  onCreated: (r: Requested) => void
}) {
  const [title, setTitle] = useState("")
  const [dynamic, setDynamic] = useState(false)
  const [useQuery, setUseQuery] = useState(false)
  const [query, setQuery] = useState<QueryParam[]>([])
  const [qKey, setQKey] = useState("")
  const [qValue, setQValue] = useState("")
  const [items, setItems] = useState<string[]>([])
  const [draft, setDraft] = useState("")
  const [example, setExample] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function addItem() {
    const v = draft.trim()
    if (!v) return
    setItems(prev => [...prev, v]); setDraft("")
  }
  function addQuery() {
    const k = qKey.trim()
    if (!k) return
    setQuery(prev => [...prev, { key: k, value: qValue.trim() }]); setQKey(""); setQValue("")
  }

  async function declare() {
    if (!title.trim()) { setError(dynamic ? "A parameter name is required" : "A route name is required"); return }
    setSaving(true); setError("")
    try {
      const res = await fetch(projectApi("/architecture/requested"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), todo: items, base, dynamic, queryParams: useQuery ? query : [], example }),
      })
      if (!res.ok) { setError("Could not save — try again"); return }
      const { requested } = await res.json()
      if (requested) onCreated(requested)
      setTitle(""); setItems([]); setDraft(""); setQuery([]); setDynamic(false); setUseQuery(false); setExample("")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Add a page</h2>
        <button onClick={onClose} className="text-foreground/60 transition-colors hover:text-foreground">
          <X size={14} />
        </button>
      </div>
      <p className="rounded-md border border-border bg-muted/30 px-3 py-1.5 font-mono text-[11px] text-foreground">
        Adding under: <span className="font-semibold">{base}</span>
      </p>

      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Route type</label>
        <SegToggle off="Static" on="Dynamic" value={dynamic} onChange={setDynamic} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
          {dynamic ? "Dynamic parameter name" : "Route name"}
        </label>
        <input
          type="text"
          placeholder={dynamic ? "e.g. slug, id" : "e.g. Orders"}
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="h-8 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {error && <span className="text-[11px] font-medium text-red-600">{error}</span>}
      </div>

      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Query params</label>
        <SegToggle off="None" on="Use query" value={useQuery} onChange={setUseQuery} />
      </div>
      {useQuery && (
        <div className="flex flex-col gap-1.5">
          {query.map((q, i) => (
            <div key={i} className="flex items-center gap-1.5 font-mono text-xs text-foreground">
              <span className="font-semibold">{q.key}</span><span className="text-foreground/50">=</span><span>{q.value || "—"}</span>
              <button onClick={() => setQuery(prev => prev.filter((_, j) => j !== i))} className="ml-auto text-foreground/50 hover:text-red-600">
                <X size={11} />
              </button>
            </div>
          ))}
          <div className="flex gap-1.5">
            <input
              value={qKey}
              onChange={e => setQKey(e.target.value)}
              placeholder="key (e.g. color)"
              className="h-8 w-1/3 rounded-md border border-border bg-background px-2 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="self-center text-foreground/50">=</span>
            <input
              value={qValue}
              onChange={e => setQValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addQuery()}
              placeholder="value (e.g. red)"
              className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button onClick={addQuery} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-foreground/40 text-foreground hover:bg-foreground hover:text-background">
              <Plus size={12} />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">To-do</label>
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-foreground">
            <span className="text-foreground/60">•</span>
            <span className="flex-1 font-medium">{it}</span>
            <button onClick={() => setItems(prev => prev.filter((_, j) => j !== i))} className="text-foreground/50 hover:text-red-600">
              <X size={11} />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a task…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addItem()}
            className="h-8 flex-1 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button onClick={addItem} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-foreground/40 text-foreground hover:bg-foreground hover:text-background">
            <Plus size={12} />
          </button>
        </div>
      </div>

      <SourceExample value={example} onChange={setExample} />

      <button
        onClick={declare}
        disabled={saving || !title.trim()}
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {saving && <Loader2 size={11} className="animate-spin" />}
        Declare page
      </button>
    </div>
  )
}
