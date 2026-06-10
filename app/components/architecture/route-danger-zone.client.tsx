"use client"

import { useEffect, useState } from "react"
import { Loader2, AlertTriangle } from "lucide-react"

type DelReq = { id: string; body: string; outcome: string | null }

// Danger zone at the very bottom of a route's panel. Deletion is NOT a function
// that wipes files — it is a request an agent plans (remove the page + refactor
// what depends on it). The user states why and the expected end result, then
// orders the deletion; the row is a flag the pipeline picks up (app.db, kind
// 'delete'). Same shape as a to-do, just a different intent.
export function RouteDangerZone({ path }: { path: string }) {
  const [reason, setReason] = useState("")
  const [outcome, setOutcome] = useState("")
  const [saving, setSaving] = useState(false)
  const [list, setList] = useState<DelReq[]>([])

  async function load() {
    const res = await fetch(`/api/architecture/tasks?path=${encodeURIComponent(path)}&kind=delete`)
    if (res.ok) setList((await res.json()).tasks ?? [])
  }
  useEffect(() => { load() }, [path])

  async function order() {
    if (!reason.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/architecture/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, kind: "delete", body: reason.trim(), outcome: outcome.trim() || null }),
      })
      if (res.ok) { setReason(""); setOutcome(""); await load() }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-8 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
      <div className="flex items-center gap-1.5 text-red-400">
        <AlertTriangle size={13} />
        <span className="text-xs font-semibold uppercase tracking-wider">Danger zone</span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        Deletion is not a button that wipes files — it is a request an agent plans. To fully remove
        this page and refactor what depends on it, describe why you are removing it and the end
        result you expect, then order the deletion.
      </p>
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="Why are you removing this page / feature?"
        rows={2}
        className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <textarea
        value={outcome}
        onChange={e => setOutcome(e.target.value)}
        placeholder="What should the result be after removal / refactor?"
        rows={2}
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <button
        onClick={order}
        disabled={saving || !reason.trim()}
        className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md bg-red-600 px-4 text-xs font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-40"
      >
        {saving && <Loader2 size={11} className="animate-spin" />}
        Order deletion
      </button>

      {list.length > 0 && (
        <div className="mt-3 border-t border-red-500/20 pt-3">
          <p className="text-[10px] uppercase tracking-wider text-red-400/70">Pending deletion requests</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {list.map(d => (
              <li key={d.id} className="flex gap-1.5 text-[11px] text-muted-foreground">
                <span className="text-red-400/60">•</span><span>{d.body}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
