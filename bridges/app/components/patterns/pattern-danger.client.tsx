"use client"

import { useState } from "react"
import { AlertTriangle, Trash2, Loader2 } from "lucide-react"
import type { Pattern } from "@/lib/patterns/pattern-format"

// Danger zone for a pattern / anti-pattern, faithful to the architecture danger
// zone. Deletion is NOT a button that wipes files — it is a REQUEST an agent plans
// (retire it + refactor any usages). Three controls:
//   1. Order deletion — reason + expected outcome → a delete-kind task (a flag the
//      agent picks up). The recommended path for a real (stable) pattern.
//   2. Discard all changes — clears every pending task → drops the (req) badge.
//   3. Remove declaration — hard-delete the file, ONLY for a declared draft (never
//      built, nothing to refactor), behind a confirmation modal.
export function PatternDanger({
  pattern, onOrderDeletion, onDiscardAll, onRemove,
}: {
  pattern: Pattern
  onOrderDeletion: (reason: string, outcome: string) => Promise<void>
  onDiscardAll: () => Promise<void>
  onRemove: () => Promise<void>
}) {
  const [reason, setReason] = useState("")
  const [outcome, setOutcome] = useState("")
  const [ordering, setOrdering] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const noun = pattern.kind === "anti" ? "anti-pattern" : "pattern"
  const dels = pattern.tasks.filter(t => t.kind === "delete")

  async function order() {
    if (!reason.trim()) return
    setOrdering(true)
    try { await onOrderDeletion(reason.trim(), outcome.trim()); setReason(""); setOutcome("") }
    finally { setOrdering(false) }
  }
  async function discard() {
    setDiscarding(true)
    try { await onDiscardAll() } finally { setDiscarding(false) }
  }
  async function remove() {
    setConfirm(false)
    setRemoving(true)
    try { await onRemove() } finally { setRemoving(false) }
  }

  return (
    <div className="rounded-lg border border-red-500/50 bg-red-500/5 p-4">
      <div className="flex items-center gap-1.5 text-red-600">
        <AlertTriangle size={13} />
        <span className="text-xs font-bold uppercase tracking-wider">Danger zone</span>
      </div>

      {/* 1. Order deletion — soft request to the agent (reason + outcome). */}
      <p className="mt-2 text-[11px] leading-relaxed text-foreground/80">
        Deletion is not a button that wipes files — it is a request an agent plans. To retire this {noun} and
        update anywhere it is used, describe why and the end result you expect, then order the deletion.
      </p>
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder={`Why are you retiring this ${noun}?`}
        rows={2}
        className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <textarea
        value={outcome}
        onChange={e => setOutcome(e.target.value)}
        placeholder="What should the result be after removal / refactor?"
        rows={2}
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <button
        onClick={order}
        disabled={ordering || !reason.trim()}
        className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md bg-red-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-40"
      >
        {ordering && <Loader2 size={11} className="animate-spin" />}
        Order deletion
      </button>

      {/* 2. Discard all changes — clear every pending task, drop the (req) badge. */}
      <div className="mt-4 border-t border-red-500/30 pt-3">
        <p className="text-[11px] leading-relaxed text-foreground/80">
          Discard every pending change on this {noun} — clears the whole to-do list (tasks and deletion
          requests) and removes the orange badge. The {noun} itself is untouched.
        </p>
        <button
          onClick={discard}
          disabled={discarding}
          className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-red-500/60 px-4 text-xs font-semibold text-red-600 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-40"
        >
          {discarding ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          Discard all changes
        </button>
      </div>

      {/* 3. Remove declaration — hard delete, ONLY for a declared draft. */}
      {pattern.declared && (
        <div className="mt-4 border-t border-red-500/30 pt-3">
          <p className="text-[11px] leading-relaxed text-foreground/80">
            Remove this declaration entirely — it is a draft that was never built, so this just discards it
            (and its tasks). Different from &quot;Order deletion&quot; above, which retires a real {noun}.
          </p>
          <button
            onClick={() => setConfirm(true)}
            disabled={removing}
            className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-red-500/60 px-4 text-xs font-semibold text-red-600 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-40"
          >
            {removing ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
            Remove declaration
          </button>
        </div>
      )}

      {dels.length > 0 && (
        <div className="mt-4 border-t border-red-500/30 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600">Pending deletion requests</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {dels.map(d => (
              <li key={d.id} className="flex gap-1.5 text-[11px] text-foreground">
                <span className="text-red-600/70">•</span>
                <span>{d.body}{d.outcome ? <span className="text-foreground/50"> → {d.outcome}</span> : null}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirm(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-1.5 text-red-600">
              <AlertTriangle size={15} />
              <h3 className="text-sm font-bold">Hard delete — are you sure?</h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-foreground/80">
              This permanently removes &ldquo;{pattern.name}&rdquo; from disk
              <span className="font-semibold text-foreground"> immediately, without AI</span>. It does not
              clean up anywhere this {noun} may be used.
            </p>
            <div className="mt-3 rounded-md border border-border bg-muted/30 p-3">
              <p className="text-[11px] font-semibold text-foreground">Recommended: order deletion</p>
              <p className="mt-1 text-[11px] leading-relaxed text-foreground/70">
                Use <span className="font-semibold">Order deletion</span> above instead — it asks the AI to
                retire this {noun} and refactor anywhere it is no longer used.
              </p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirm(false)} className="inline-flex h-8 items-center rounded-md border border-border px-4 text-xs font-semibold text-foreground transition-colors hover:bg-muted">
                Cancel
              </button>
              <button onClick={remove} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-red-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-red-500">
                <Trash2 size={11} /> I understand — hard-delete anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
