"use client"

import { useState } from "react"
import { AlertTriangle, Trash2, Loader2 } from "lucide-react"
import type { Draft } from "@/lib/ai-draft/draft-format"

// Danger zone for a draft, faithful to the architecture danger zone (Order deletion +
// Discard all), plus Remove draft. Nothing here touches the REAL file:
//   1. Order deletion — reason + expected outcome → a delete-kind wish. This asks the
//      agent to RETIRE the real original (skill / MCP / instruction) and refactor uses.
//   2. Discard all changes — clears every wish on this draft → drops the (req) badge.
//   3. Remove draft — hard-delete the mirror file (cancels the wish). The real original
//      is never affected; a seeded instruction doc just resets empty on next load.
export function DraftDanger({
  draft, onOrderDeletion, onDiscardAll, onRemove,
}: {
  draft: Draft
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
  const noun = draft.kind === "instruction" ? "instruction" : draft.kind === "mcp" ? "MCP connector" : "skill"
  const dels = draft.tasks.filter(t => t.kind === "delete")

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

      {/* 1. Order deletion — ask the agent to retire the REAL original. */}
      <p className="mt-2 text-[11px] leading-relaxed text-foreground/80">
        Deletion is not a button that wipes files — it is a request an agent plans. To retire the real {noun}
        this draft refers to and update anywhere it is used, describe why and the end result you expect, then
        order the deletion.
      </p>
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder={`Why should the agent retire this ${noun}?`}
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

      {/* 2. Discard all changes — clear every wish, drop the (req) badge. */}
      <div className="mt-4 border-t border-red-500/30 pt-3">
        <p className="text-[11px] leading-relaxed text-foreground/80">
          Discard every wish on this draft — clears the whole list (wishes and deletion requests) and removes
          the orange badge. The real {noun} is untouched.
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

      {/* 3. Remove draft — hard-delete the mirror file. Never the real original. */}
      <div className="mt-4 border-t border-red-500/30 pt-3">
        <p className="text-[11px] leading-relaxed text-foreground/80">
          Remove this draft from the mirror entirely. This deletes only the draft file under
          AI-DRAFT-SETTINGS/ — the real {noun} is never touched.
        </p>
        <button
          onClick={() => setConfirm(true)}
          disabled={removing}
          className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-red-500/60 px-4 text-xs font-semibold text-red-600 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-40"
        >
          {removing ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          Remove draft
        </button>
      </div>

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
              <h3 className="text-sm font-bold">Remove draft — are you sure?</h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-foreground/80">
              This permanently removes the draft &ldquo;{draft.name}&rdquo; from the mirror
              <span className="font-semibold text-foreground"> immediately</span>. The real {noun} is not affected.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirm(false)} className="inline-flex h-8 items-center rounded-md border border-border px-4 text-xs font-semibold text-foreground transition-colors hover:bg-muted">
                Cancel
              </button>
              <button onClick={remove} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-red-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-red-500">
                <Trash2 size={11} /> Remove draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
