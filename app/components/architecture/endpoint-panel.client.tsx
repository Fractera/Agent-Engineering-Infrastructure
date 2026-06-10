"use client"

import { useState } from "react"
import { Plus, X, Loader2 } from "lucide-react"
import { projectApi } from "@/lib/architecture/project-api"
import type { Requested } from "@/lib/architecture/requested-tree"

// Right-side panel to declare an API endpoint (kind "api") under a chosen base
// (the default project → /api, or a project → /api/project/<slug>). Name + a
// to-do spec for the agent. Nothing is built here; it appears in the API list
// as a pending (orange + req) node.
export function EndpointPanel({
  base,
  onClose,
  onCreated,
}: {
  base: string
  onClose: () => void
  onCreated: (r: Requested) => void
}) {
  const [title, setTitle] = useState("")
  const [items, setItems] = useState<string[]>([])
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function addItem() {
    const v = draft.trim()
    if (!v) return
    setItems(prev => [...prev, v]); setDraft("")
  }

  async function declare() {
    if (!title.trim()) { setError("An endpoint name is required"); return }
    setSaving(true); setError("")
    try {
      const res = await fetch(projectApi("/architecture/requested"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), todo: items, base, kind: "api" }),
      })
      if (!res.ok) { setError("Could not save — try again"); return }
      const { requested } = await res.json()
      if (requested) onCreated(requested)
      setTitle(""); setItems([]); setDraft("")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Add an endpoint</h2>
        <button onClick={onClose} className="text-foreground/60 transition-colors hover:text-foreground">
          <X size={14} />
        </button>
      </div>
      <p className="rounded-md border border-border bg-muted/30 px-3 py-1.5 font-mono text-[11px] text-foreground">
        Adding under: <span className="font-semibold">{base}</span>
      </p>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Endpoint name</label>
        <input
          type="text"
          placeholder="e.g. orders"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="h-8 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {error && <span className="text-[11px] font-medium text-red-600">{error}</span>}
      </div>

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

      <button
        onClick={declare}
        disabled={saving || !title.trim()}
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {saving && <Loader2 size={11} className="animate-spin" />}
        Declare endpoint
      </button>
    </div>
  )
}
