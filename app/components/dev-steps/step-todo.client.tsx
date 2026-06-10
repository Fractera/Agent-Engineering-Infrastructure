"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import type { StepTask } from "@/lib/dev-steps/step-file"

// To-do checklist of a development step — the concrete sub-tasks of the step,
// stored in the step's markdown file (tasks[]). Editable for NEW steps (add /
// remove save the file at once via the parent), read-only for COMPLETED steps.
export function StepTodo({
  tasks, editable, onSave,
}: {
  tasks: StepTask[]
  editable: boolean
  onSave: (tasks: StepTask[]) => Promise<void>
}) {
  const [draft, setDraft] = useState("")

  async function add() {
    const body = draft.trim()
    if (!body) return
    setDraft("")
    await onSave([...tasks, { id: crypto.randomUUID(), body }])
  }
  async function remove(id: string) {
    await onSave(tasks.filter(t => t.id !== id))
  }

  return (
    <div className="mt-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">To-do</p>
      <p className="mb-2 mt-0.5 text-[11px] text-foreground/70">
        The concrete sub-tasks of this step{editable ? " — an agent picks them up." : "."}
      </p>
      <div className="flex flex-col gap-1.5">
        {tasks.length === 0 && <p className="text-xs text-foreground/50">No tasks.</p>}
        {tasks.map(t => (
          <div key={t.id} className="flex items-start gap-2 text-xs text-foreground">
            <span className="mt-0.5 text-foreground/60">•</span>
            <span className="flex-1 font-medium">{t.body}</span>
            {editable && (
              <button onClick={() => remove(t.id)} className="mt-0.5 text-foreground/50 hover:text-red-600">
                <X size={11} />
              </button>
            )}
          </div>
        ))}
        {editable && (
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === "Enter" && add()}
              placeholder="Add a task…"
              className="h-8 flex-1 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button onClick={add} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-foreground/40 text-foreground hover:bg-foreground hover:text-background">
              <Plus size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
