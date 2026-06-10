"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, X } from "lucide-react"
import type { Step } from "@/lib/dev-steps/step-file"
import { SegToggle } from "@/components/ui/seg-toggle.client"
import { AddStepForm } from "@/components/dev-steps/add-step-form.client"
import { importanceDot, importanceText, ImportanceToggle } from "@/components/dev-steps/importance-toggle.client"
import type { Importance } from "@/lib/dev-steps/step-file"

type Mode = "new" | "completed"

// Development steps — a filesystem-backed view of the project's work log, mirroring
// /architecture. Left = the list of steps (number + name); right = the opened step
// (number, name, full description, Source, To-do, Danger zone). Two modes via the
// header switch: NEW STEPS (editable) and COMPLETED STEPS (read-only, with a date).
// Built incrementally — S2 reads steps from the filesystem and renders the list.

export function DevelopmentStepsApp() {
  const [news, setNews] = useState<Step[]>([])
  const [completed, setCompleted] = useState<Step[]>([])
  const [mode, setMode] = useState<Mode>("new")
  const [selected, setSelected] = useState<Step | null>(null)
  const [adding, setAdding] = useState(false)

  function refresh() {
    fetch("/api/development-steps/signature")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) { setNews(d.new ?? []); setCompleted(d.completed ?? []) } })
      .catch(() => {})
  }
  useEffect(() => { refresh() }, [])

  const steps = useMemo(() => (mode === "completed" ? completed : news), [mode, completed, news])
  // Clear the open step when switching mode (a new-mode step is not in completed).
  useEffect(() => { setSelected(null); setAdding(false) }, [mode])

  function onCreated(s: Step) {
    setNews(prev => [...prev.filter(p => p.id !== s.id), s].sort((a, b) => a.number - b.number))
    setMode("new")
    setAdding(false)
    setSelected(s)
  }

  // Patch the open NEW step (importance/description/…) — writes the file directly.
  async function patchStep(patch: Partial<Pick<Step, "importance" | "description" | "name">>) {
    if (!selected) return
    const res = await fetch(`/api/development-steps/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (!res.ok) return
    const { step } = await res.json()
    if (step) {
      setSelected(step)
      setNews(prev => prev.map(s => (s.id === step.id ? step : s)).sort((a, b) => a.number - b.number))
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <a href="/" className="font-mono text-xs text-foreground/70 transition-colors hover:text-foreground">
          ← back
        </a>
        <h1 className="mt-1 text-xl font-bold text-foreground">Development steps</h1>
        <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-foreground/80">
          The project&apos;s work log, kept as real files an agent reads and writes. Write a task here
          yourself, or — recommended — let the chat or MCP draft it for you; you can also command the
          coding agents (Claude Code, Codex, and the rest) directly. However it starts, every task appears
          first in New steps, then moves to Completed steps with its date — a clear, planning-friendly view
          of what is being built, kept out of the main flow.
        </p>

        {/* Mode switch — New steps (editable) vs Completed steps (read-only). */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] text-foreground/50">{steps.length} {mode === "completed" ? "completed" : "active"}</span>
          <SegToggle<Mode>
            options={[{ value: "new", label: "New steps" }, { value: "completed", label: "Completed steps" }]}
            value={mode}
            onChange={setMode}
          />
        </div>

        <div className="mt-3 overflow-x-auto">
          <div className="flex h-[72vh] min-w-[720px] overflow-hidden rounded-xl border border-border">
            <div className="flex w-1/2 flex-col border-r border-border bg-muted/10">
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">
                  {mode === "completed" ? "Completed steps" : "New steps"}
                </span>
                {mode === "new" && (
                  <button
                    onClick={() => { setSelected(null); setAdding(v => !v) }}
                    className="inline-flex h-7 items-center gap-1.5 rounded-md border border-foreground/40 px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
                  >
                    {adding ? <X size={11} /> : <Plus size={11} />}
                    {adding ? "Close" : "Add step"}
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {steps.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-foreground/50">No steps yet.</p>
                ) : (
                  steps.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                        selected?.id === s.id ? "bg-primary/15 text-foreground" : "text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${importanceDot[s.importance]}`} />
                      <span className="shrink-0 font-mono text-foreground/60">{String(s.number).padStart(2, "0")}</span>
                      <span className="truncate font-semibold">{s.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="w-1/2">
              {adding ? (
                <AddStepForm onClose={() => setAdding(false)} onCreated={onCreated} />
              ) : selected ? (
                <div className="flex h-full flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${importanceDot[selected.importance]}`} />
                    <span className="font-mono text-xs text-foreground/60">Step {String(selected.number).padStart(2, "0")}</span>
                    {selected.status === "new" ? (
                      <ImportanceToggle
                        value={selected.importance}
                        onChange={(v: Importance) => patchStep({ importance: v })}
                      />
                    ) : (
                      <span className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${importanceText[selected.importance]}`}>{selected.importance}</span>
                    )}
                    {selected.status === "completed" && selected.completedAt && (
                      <span className="rounded-full border border-green-500/50 px-2 py-0.5 font-mono text-[10px] font-semibold text-green-600">
                        completed {selected.completedAt}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1 text-sm font-bold text-foreground">{selected.name}</h2>
                  <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-foreground/80">
                    {selected.description || "No description yet."}
                  </p>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center p-10 text-center">
                  <p className="max-w-xs text-xs text-foreground/60">Select a step on the left to read it.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
