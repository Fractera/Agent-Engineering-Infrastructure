"use client"

import type { Pattern } from "@/lib/patterns/pattern-format"
import { CodeEditor } from "@/components/architecture/code-editor.client"

// Right-hand read view of a pattern / anti-pattern, mirroring the architecture
// RouteDetailPanel's standard sections: title + description + Source code example
// (Monaco) + Steps. Read-only for now; inline editing and the Danger zone land in
// later sub-steps (P5–P8).
export function PatternDetail({ pattern, categoryLabel }: { pattern: Pattern; categoryLabel: string }) {
  const kindLabel = pattern.kind === "anti" ? "Anti-pattern" : `Pattern · ${categoryLabel}`
  const language = pattern.kind === "anti" ? "shell" : "tsx"
  return (
    <div className="space-y-6 p-5">
      <header>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-foreground/50">{kindLabel}</span>
          {pattern.declared && (
            <span className="rounded-full border border-amber-500/50 px-1.5 font-mono text-[9px] font-semibold text-amber-600">req</span>
          )}
        </div>
        <h2 className="mt-1 text-lg font-semibold text-foreground">{pattern.name}</h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/80">
          {pattern.description || "No description yet."}
        </p>
      </header>

      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-foreground/70">Source code example</h3>
        {pattern.code.trim() ? (
          <div className="overflow-hidden rounded-lg border border-border">
            <CodeEditor value={pattern.code} language={language} readOnly />
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border p-4 text-xs text-foreground/50">
            No example yet — an agent fills this in.
          </p>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-foreground/70">Steps</h3>
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
      </section>

      <p className="text-[11px] text-foreground/40">Inline editing and the Danger zone land next.</p>
    </div>
  )
}
