"use client"

import { useState } from "react"
import { AlertTriangle, Trash2, Loader2 } from "lucide-react"

// Danger zone of a NEW development step — permanently delete its file. Behind a
// confirmation modal (same pattern as the architecture hard-delete). Completed
// steps have no danger zone (read-only history).
export function StepDanger({ onRemove }: { onRemove: () => Promise<void> }) {
  const [confirm, setConfirm] = useState(false)
  const [removing, setRemoving] = useState(false)

  async function remove() {
    setConfirm(false)
    setRemoving(true)
    try { await onRemove() } finally { setRemoving(false) }
  }

  return (
    <div className="mt-6 rounded-lg border border-red-500/50 bg-red-500/5 p-4">
      <div className="flex items-center gap-1.5 text-red-600">
        <AlertTriangle size={13} />
        <span className="text-xs font-bold uppercase tracking-wider">Danger zone</span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-foreground/80">
        Delete this step permanently — removes its file from disk. This cannot be undone.
      </p>
      <button
        onClick={() => setConfirm(true)}
        disabled={removing}
        className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-red-500/60 px-4 text-xs font-semibold text-red-600 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-40"
      >
        {removing ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
        Delete step
      </button>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirm(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-1.5 text-red-600">
              <AlertTriangle size={15} />
              <h3 className="text-sm font-bold">Delete this step?</h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-foreground/80">
              This permanently removes the step&apos;s file from disk. It will not move to the completed
              history — it is gone. This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirm(false)} className="inline-flex h-8 items-center rounded-md border border-border px-4 text-xs font-semibold text-foreground transition-colors hover:bg-muted">
                Cancel
              </button>
              <button onClick={remove} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-red-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-red-500">
                <Trash2 size={11} /> Delete step
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
