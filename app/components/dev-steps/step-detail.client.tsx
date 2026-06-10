"use client"

import { useEffect, useState } from "react"
import { ChevronRight, Loader2 } from "lucide-react"
import { importanceText, ImportanceToggle, importanceDot } from "./importance-toggle.client"
import { StepSource } from "./step-source.client"
import type { Importance, Step } from "@/lib/dev-steps/step-file"

// Right-panel detail for one development step. NEW steps are editable in place
// (importance, description, raw Source — each saves the file directly); COMPLETED
// steps are read-only history with a completion date. To-do + Danger zone are
// added in S8.
export function StepDetail({
  step, onPatch, onRefresh,
}: {
  step: Step
  onPatch: (patch: Partial<Pick<Step, "importance" | "description" | "name">>) => Promise<void>
  onRefresh: () => void
}) {
  const isNew = step.status === "new"
  const [desc, setDesc] = useState(step.description)
  const [savingDesc, setSavingDesc] = useState(false)
  const [srcOpen, setSrcOpen] = useState(false)
  // Reset the local draft when a different step is opened.
  useEffect(() => { setDesc(step.description) }, [step.id, step.description])

  async function saveDesc() {
    setSavingDesc(true)
    try { await onPatch({ description: desc }) } finally { setSavingDesc(false) }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${importanceDot[step.importance]}`} />
          <span className="font-mono text-xs text-foreground/60">Step {String(step.number).padStart(2, "0")}</span>
          {isNew ? (
            <ImportanceToggle value={step.importance} onChange={(v: Importance) => onPatch({ importance: v })} />
          ) : (
            <span className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${importanceText[step.importance]}`}>{step.importance}</span>
          )}
          {step.status === "completed" && step.completedAt && (
            <span className="rounded-full border border-green-500/50 px-2 py-0.5 font-mono text-[10px] font-semibold text-green-600">
              completed {step.completedAt}
            </span>
          )}
        </div>
        <h2 className="mt-1.5 text-sm font-bold text-foreground">{step.name}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Description</p>
        {isNew ? (
          <>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={6}
              placeholder="What is this step? Write the task, or let the chat / MCP draft it."
              className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-xs leading-relaxed text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {desc !== step.description && (
              <button
                onClick={saveDesc}
                disabled={savingDesc}
                className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {savingDesc && <Loader2 size={11} className="animate-spin" />}
                Save description
              </button>
            )}
          </>
        ) : (
          <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground/80">
            {step.description || "No description."}
          </p>
        )}

        {/* Source — the raw markdown file. */}
        <div className="mt-5 overflow-hidden rounded-lg border border-border">
          <button
            onClick={() => setSrcOpen(v => !v)}
            className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-muted/60"
          >
            <span>Source</span>
            <ChevronRight size={12} className={`text-foreground/70 transition-transform ${srcOpen ? "rotate-90" : ""}`} />
          </button>
          {srcOpen && (
            <div className="border-t border-border p-3">
              <StepSource id={step.id} editable={isNew} onSaved={onRefresh} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
