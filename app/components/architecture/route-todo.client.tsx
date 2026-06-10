"use client"

import { useEffect, useState } from "react"
import { Plus, X, Loader2 } from "lucide-react"
import { projectApi } from "@/lib/architecture/project-api"
import { CODE_DIFF_PREFIX } from "@/lib/architecture/line-diff"

// A code-change task body is "<prefix><rel>\n<diff>"; render it as a colored diff
// so the request is legible later. Plain tasks render as text.
function TaskBody({ body }: { body: string }) {
  if (!body.startsWith(CODE_DIFF_PREFIX)) {
    return <span className="flex-1 font-medium">{body}</span>
  }
  const nl = body.indexOf("\n")
  const head = body.slice(CODE_DIFF_PREFIX.length, nl < 0 ? undefined : nl)
  const diff = nl < 0 ? "" : body.slice(nl + 1)
  return (
    <div className="flex-1 min-w-0">
      <p className="font-mono text-[11px] font-semibold text-foreground">Code change · {head}</p>
      <pre className="mt-1 max-h-48 overflow-auto rounded border border-border bg-muted/30 p-2 font-mono text-[10px] leading-snug">
        {diff.split("\n").map((l, i) => (
          <div
            key={i}
            className={
              l.startsWith("+") ? "text-green-600" :
              l.startsWith("-") ? "text-red-600" : "text-foreground/60"
            }
          >
            {l || " "}
          </div>
        ))}
      </pre>
    </div>
  )
}

type Item = { id?: string; body: string }

// Native to-do list at the bottom of a live route's panel. Edits are staged
// locally; a "Save changes" button appears once the list differs from what is
// stored, and saving writes the page's tasks into the route's README.md on disk
// — the same file an agent reads. On save the parent refreshes so the (req)
// badge appears on this page's node in the tree.
export function RouteTodo({ path, onChanged, reloadSignal = 0 }: { path: string; onChanged?: () => void; reloadSignal?: number }) {
  const [items, setItems] = useState<Item[]>([])
  const [serverIds, setServerIds] = useState<string[]>([])
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch(projectApi(`/architecture/tasks?path=${encodeURIComponent(path)}&kind=todo`))
    if (res.ok) {
      const tasks: { id: string; body: string }[] = (await res.json()).tasks ?? []
      setItems(tasks.map(t => ({ id: t.id, body: t.body })))
      setServerIds(tasks.map(t => t.id))
    }
  }
  // Reload on path change and whenever a sibling (Source / Danger zone) records a
  // change, so the list updates without a page refresh.
  useEffect(() => { load() }, [path, reloadSignal])

  function addDraft() {
    const body = draft.trim()
    if (!body) return
    setItems(prev => [...prev, { body }])
    setDraft("")
  }
  function removeAt(i: number) {
    setItems(prev => prev.filter((_, j) => j !== i))
  }

  const added = items.filter(it => !it.id)
  const keptIds = items.filter(it => it.id).map(it => it.id as string)
  const removed = serverIds.filter(id => !keptIds.includes(id))
  const dirty = added.length > 0 || removed.length > 0

  async function save() {
    setSaving(true)
    try {
      for (const it of added) {
        await fetch(projectApi("/architecture/tasks"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path, kind: "todo", body: it.body }),
        })
      }
      for (const id of removed) {
        await fetch(projectApi(`/architecture/tasks/${id}`), { method: "DELETE" })
      }
      await load()
      onChanged?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">To-do</p>
      <p className="mb-2 mt-0.5 text-[11px] text-foreground/70">
        Tasks for this page an agent can pick up. Development doesn&apos;t end at publish.
      </p>
      <div className="flex flex-col gap-1.5">
        {items.map((t, i) => (
          <div key={t.id ?? `new-${i}`} className="flex items-start gap-2 text-xs text-foreground">
            <span className="mt-0.5 text-foreground/60">•</span>
            <TaskBody body={t.body} />
            {!t.id && <span className="mt-0.5 font-mono text-[9px] font-semibold text-amber-600">unsaved</span>}
            <button onClick={() => removeAt(i)} className="mt-0.5 text-foreground/50 hover:text-red-600">
              <X size={11} />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addDraft()}
            placeholder="Add a task…"
            className="h-8 flex-1 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={addDraft}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-foreground/40 text-foreground hover:bg-foreground hover:text-background"
          >
            <Plus size={12} />
          </button>
        </div>
        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="mt-1 inline-flex h-8 items-center justify-center gap-1.5 self-start rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {saving && <Loader2 size={11} className="animate-spin" />}
            Save changes
          </button>
        )}
      </div>
    </div>
  )
}
