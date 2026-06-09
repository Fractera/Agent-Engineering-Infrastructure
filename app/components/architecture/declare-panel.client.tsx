"use client"

import { useEffect, useState } from "react"
import { Plus, X, Loader2, FileText } from "lucide-react"

type Requested = {
  id: string
  slug: string
  title: string
  todo: string[]
  status: string
  created_at: string
}

// The right-side panel opened by "Add page". You describe the page as a todo
// list; it is saved as a requested route (a flag for an agent to plan and build,
// ARCHITECTURE §3.11). Activation of the build is a separate step.
export function DeclarePanel({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("")
  const [items, setItems] = useState<string[]>([])
  const [draft, setDraft] = useState("")
  const [list, setList] = useState<Requested[]>([])
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch("/api/architecture/requested")
    if (res.ok) setList((await res.json()).requested ?? [])
  }
  useEffect(() => { load() }, [])

  function addItem() {
    const v = draft.trim()
    if (!v) return
    setItems(prev => [...prev, v])
    setDraft("")
  }

  async function declare() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/architecture/requested", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), todo: items }),
      })
      if (res.ok) { setTitle(""); setItems([]); setDraft(""); await load() }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Add a page</h2>
        <button onClick={onClose} className="text-muted-foreground transition-colors hover:text-foreground">
          <X size={14} />
        </button>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Describe the page you want as a list of tasks. It is saved as a requested
        page — a to-do flag an agent picks up to plan and build it.
      </p>

      <input
        type="text"
        placeholder="Page title (e.g. Orders)"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="h-8 rounded-md border border-border bg-background px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />

      <div className="flex flex-col gap-1.5">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-foreground">
            <span className="text-muted-foreground/60">•</span>
            <span className="flex-1">{it}</span>
            <button onClick={() => setItems(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-500">
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
            className="h-8 flex-1 rounded-md border border-border bg-background px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button onClick={addItem} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted">
            <Plus size={12} />
          </button>
        </div>
      </div>

      <button
        onClick={declare}
        disabled={saving || !title.trim()}
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-foreground px-4 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {saving && <Loader2 size={11} className="animate-spin" />}
        Declare page
      </button>

      {list.length > 0 && (
        <div className="mt-2 flex flex-col gap-3 overflow-y-auto border-t border-border pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Requested pages</p>
          {list.map(r => (
            <div key={r.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5">
                <FileText size={12} className="text-amber-400/90" />
                <span className="text-xs font-medium text-foreground">{r.title}</span>
                <span className="ml-auto rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{r.status}</span>
              </div>
              {r.todo.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1">
                  {r.todo.map((t, i) => (
                    <li key={i} className="flex gap-1.5 text-[11px] text-muted-foreground">
                      <span className="text-muted-foreground/50">•</span><span>{t}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
