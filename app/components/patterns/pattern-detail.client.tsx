"use client"

import { useState } from "react"
import type { Pattern } from "@/lib/patterns/pattern-format"
import { CodeEditor } from "@/components/architecture/code-editor.client"
import { AccordionItem } from "./accordion-item.client"

// Right-hand read view of a pattern / anti-pattern, mirroring the architecture
// RouteDetailPanel: a header + description, then the standard sections as ONE
// accordion — Source code example (Monaco), Steps, Danger zone. Read-only for now;
// inline editing and the real delete land in later sub-steps (P5–P8).
export function PatternDetail({ pattern, categoryLabel }: { pattern: Pattern; categoryLabel: string }) {
  const kindLabel = pattern.kind === "anti" ? "Anti-pattern" : `Pattern · ${categoryLabel}`
  const language = pattern.kind === "anti" ? "shell" : "tsx"
  const [open, setOpen] = useState<Set<string>>(new Set())
  function toggle(t: string) {
    setOpen(prev => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next
    })
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
        <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground/80">
          {pattern.description || "No description yet."}
        </p>

        <div className="mt-5 flex flex-col gap-1.5">
          <AccordionItem title="Source code example" open={open.has("source")} onToggle={() => toggle("source")}>
            {pattern.code.trim() ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <CodeEditor value={pattern.code} language={language} readOnly />
              </div>
            ) : (
              <p className="text-xs text-foreground/50">No example yet — an agent fills this in.</p>
            )}
          </AccordionItem>

          <AccordionItem title="Steps" open={open.has("steps")} onToggle={() => toggle("steps")}>
            {pattern.tasks.length === 0 ? (
              <p className="text-xs text-foreground/50">No steps.</p>
            ) : (
              <ul className="space-y-1.5">
                {pattern.tasks.map(t => (
                  <li key={t.id} className="flex gap-2 text-xs text-foreground/80">
                    <span className="shrink-0 text-foreground/40">–</span>
                    <span>{t.body}</span>
                  </li>
                ))}
              </ul>
            )}
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
