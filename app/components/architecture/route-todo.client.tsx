"use client"

import { useEffect, useState } from "react"
import { Plus, X, Loader2 } from "lucide-react"

type Task = { id: string; body: string }

// Native to-do list at the bottom of a live route's panel. Tasks an agent can
// pick up — development doesn't end at publish. Persisted in app.db (route_tasks,
// kind 'todo'); the same endpoint an agent writes through.
export function RouteTodo({ path }: { path: string }) {
  const [items, setItems] = useState<Task[]>([])
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch(`/api/architecture/tasks?path=${encodeURIComponent(path)}&kind=todo`)
    if (res.ok) setItems((await res.json()).tasks ?? [])
  }
  useEffect(() => { load() }, [path])

  async function add() {
    const body = draft.trim()
    if (!body) return
    setSaving(true)
    try {
      const res = await fetch("/api/architecture/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, kind: "todo", body }),
      })
      if (res.ok) { setDraft(""); await load() }
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/architecture/tasks/${id}`, { method: "DELETE" })
    if (res.ok) setItems(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="mt-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">To-do</p>
      <p className="mb-2 mt-0.5 text-[11px] text-foreground/70">
        Tasks for this page an agent can pick up. Development doesn&apos;t end at publish.
      </p>
      <div className="flex flex-col gap-1.5">
        {items.map(t => (
          <div key={t.id} className="flex items-center gap-2 text-xs text-foreground">
            <span className="text-foreground/60">•</span>
            <span className="flex-1 font-medium">{t.body}</span>
            <button onClick={() => remove(t.id)} className="text-foreground/50 hover:text-red-600">
              <X size={11} />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            placeholder="Add a task…"
            className="h-8 flex-1 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={add}
            disabled={saving}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-foreground/40 text-foreground hover:bg-foreground hover:text-background disabled:opacity-40"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          </button>
        </div>
      </div>
    </div>
  )
}
