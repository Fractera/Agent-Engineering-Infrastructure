"use client"

import { useState } from "react"
import { AlertTriangle, Trash2, Loader2, Sparkles } from "lucide-react"
import type { Pattern } from "@/lib/patterns/pattern-format"

// Danger zone body for a pattern / anti-pattern, mirroring the architecture danger
// zone: a SOFT removal (recommended) asks an agent to retire it and tidy usages — a
// reversible task; a HARD delete removes the file from disk now, behind a
// confirmation modal (DELETE /api/patterns/[id]).
export function PatternDanger({
  pattern, onOrderRemoval, onRemove,
}: {
  pattern: Pattern
  onOrderRemoval: () => Promise<void>
  onRemove: () => Promise<void>
}) {
  const [confirm, setConfirm] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [ordering, setOrdering] = useState(false)
  const noun = pattern.kind === "anti" ? "anti-pattern" : "pattern"

  async function order() {
    setOrdering(true)
    try { await onOrderRemoval() } finally { setOrdering(false) }
  }
  async function remove() {
    setConfirm(false)
    setRemoving(true)
    try { await onRemove() } finally { setRemoving(false) }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] leading-relaxed text-foreground/70">
          Recommended: ask an agent to retire this {noun} and update any usages. Reversible — it stays until done.
        </p>
        <button
          onClick={order}
          disabled={ordering}
          className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-amber-500/60 px-4 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-500 hover:text-white disabled:opacity-40"
        >
          {ordering ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
          Order soft removal
        </button>
      </div>

      <div className="border-t border-red-500/30 pt-3">
        <p className="text-[11px] leading-relaxed text-foreground/70">
          Or delete the file now — removes it from disk immediately. This cannot be undone.
        </p>
        <button
          onClick={() => setConfirm(true)}
          disabled={removing}
          className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-red-500/60 px-4 text-xs font-semibold text-red-600 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-40"
        >
          {removing ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          Delete now
        </button>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirm(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-1.5 text-red-600">
              <AlertTriangle size={15} />
              <h3 className="text-sm font-bold">Delete this {noun}?</h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-foreground/80">
              This permanently removes &ldquo;{pattern.name}&rdquo; from disk. This cannot be undone. For a clean
              removal that also tidies usages, use &ldquo;Order soft removal&rdquo; instead.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirm(false)} className="inline-flex h-8 items-center rounded-md border border-border px-4 text-xs font-semibold text-foreground transition-colors hover:bg-muted">
                Cancel
              </button>
              <button onClick={remove} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-red-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-red-500">
                <Trash2 size={11} /> Delete now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
