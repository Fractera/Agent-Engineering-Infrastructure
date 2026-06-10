"use client"

// Development steps — a filesystem-backed view of the project's work log, mirroring
// /architecture. Left = the list of steps (number + name); right = the opened step
// (number, name, full description, Source, To-do, Danger zone). Two modes via the
// header switch: NEW STEPS (editable) and COMPLETED STEPS (read-only, with a date).
// Built incrementally — S1 is the page shell (header + empty two-pane).
export function DevelopmentStepsApp() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <a href="/" className="font-mono text-xs text-foreground/70 transition-colors hover:text-foreground">
          ← back
        </a>
        <h1 className="mt-1 text-xl font-bold text-foreground">Development steps</h1>
        <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-foreground/80">
          The project&apos;s work log — every step of how this app is being built, kept as real files an
          agent reads and writes. Declare a step, mark how important it is, and an agent picks it up; once
          done it moves to the completed history with its date. This keeps the build transparent and lets
          you and your agents stay in sync without mixing it into the main flow.
        </p>

        <div className="mt-5 overflow-x-auto">
          <div className="flex h-[72vh] min-w-[720px] overflow-hidden rounded-xl border border-border">
            <div className="flex w-1/2 flex-col border-r border-border bg-muted/10">
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">Steps</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 text-xs text-foreground/50">
                No steps yet.
              </div>
            </div>
            <div className="w-1/2">
              <div className="flex h-full items-center justify-center p-10 text-center">
                <p className="max-w-xs text-xs text-foreground/60">
                  Select a step on the left to read it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
