"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus, X } from "lucide-react"
import type { Pattern } from "@/lib/patterns/pattern-format"
import { CodeEditor } from "@/components/architecture/code-editor.client"
import { AccordionItem } from "./accordion-item.client"

// Right-hand detail view of a pattern / anti-pattern, mirroring the architecture
// RouteDetailPanel: header + editable description, then the standard sections as ONE
// accordion — Source code example (Monaco), Steps, Danger zone. Description saves
// directly (PATCH). Source/Steps editing and the real delete land in P6–P8.
export function PatternDetail({
  pattern, categoryLabel, onPatch,
}: {
  pattern: Pattern
  categoryLabel: string
  onPatch: (patch: Record<string, unknown>) => Promise<void>
}) {
  const kindLabel = pattern.kind === "anti" ? "Anti-pattern" : `Pattern · ${categoryLabel}`
  const language = pattern.kind === "anti" ? "shell" : "tsx"
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [desc, setDesc] = useState(pattern.description)
  const [code, setCode] = useState(pattern.code)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [savingCode, setSavingCode] = useState(false)
  // Reset the local drafts when a different pattern is opened (or saved).
  useEffect(() => {
    setDesc(pattern.description)
    setCode(pattern.code)
  }, [pattern.id, pattern.description, pattern.code])

  function toggle(t: string) {
    setOpen(prev => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next
    })
  }
  async function saveDesc() {
    setSaving(true)
    try { await onPatch({ description: desc }) } finally { setSaving(false) }
  }
  async function saveCode() {
    setSavingCode(true)
    try { await onPatch({ code }) } finally { setSavingCode(false) }
  }
  // Adding a task marks the pattern as needing work (pending) — it gets a (req)
  // badge until an agent does it. Add/remove save immediately.
  async function addTask() {
    const body = draft.trim()
    if (!body) return
    setDraft("")
    await onPatch({ tasks: [...pattern.tasks, { id: crypto.randomUUID(), body }] })
  }
  async function removeTask(id: string) {
    await onPatch({ tasks: pattern.tasks.filter(t => t.id !== id) })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-foreground/50">{kindLabel}</span>
          {pattern.declared && (
            <span className="rounded-full border border-amber-500/50 px-1.5 font-mono text-[9px] font-semibold text-amber-600">req</span>
          )}
        </div>
        <h2 className="mt-1.5 text-sm font-bold text-foreground">{pattern.name}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Description</p>
        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          rows={5}
          placeholder="What is this pattern for? The name says it — add intent here, or let an agent draft it."
          className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-xs leading-relaxed text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {desc !== pattern.description && (
          <button
            onClick={saveDesc}
            disabled={saving}
            className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {saving && <Loader2 size={11} className="animate-spin" />}
            Save description
          </button>
        )}

        <div className="mt-5 flex flex-col gap-1.5">
          <AccordionItem title="Source code example" open={open.has("source")} onToggle={() => toggle("source")}>
            <div className="overflow-hidden rounded-lg border border-border">
              <CodeEditor value={code} language={language} onChange={setCode} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              {code !== pattern.code && (
                <button
                  onClick={saveCode}
                  disabled={savingCode}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {savingCode && <Loader2 size={11} className="animate-spin" />}
                  Save example
                </button>
              )}
              {!pattern.code.trim() && code === pattern.code && (
                <span className="text-[11px] text-foreground/40">Empty — an agent (or you) fills in this reusable example.</span>
              )}
            </div>
          </AccordionItem>

          <AccordionItem title="Steps" open={open.has("steps")} onToggle={() => toggle("steps")}>
            <div className="flex flex-col gap-1.5">
              {pattern.tasks.map(t => (
                <div key={t.id} className="flex items-center gap-2 text-xs text-foreground">
                  <span className="shrink-0 text-foreground/60">•</span>
                  <span className="flex-1">{t.body}</span>
                  <button onClick={() => removeTask(t.id)} className="shrink-0 text-foreground/50 transition-colors hover:text-red-600">
                    <X size={11} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a task for an agent…"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addTask()}
                  className="h-8 flex-1 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button onClick={addTask} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-foreground/40 text-foreground transition-colors hover:bg-foreground hover:text-background">
                  <Plus size={12} />
                </button>
              </div>
              <p className="text-[11px] text-foreground/40">A task marks this pattern as needing work — it shows a (req) badge until an agent does it.</p>
            </div>
          </AccordionItem>

          <AccordionItem title="Danger zone" open={open.has("danger")} onToggle={() => toggle("danger")} tone="danger">
            <p className="text-xs text-foreground/60">
              Hard-delete this {pattern.kind === "anti" ? "anti-pattern" : "pattern"} (with confirmation), or order a
              soft AI removal. Wired in a later sub-step.
            </p>
          </AccordionItem>
        </div>
      </div>
    </div>
  )
}
