"use client"

import { Blocks } from "lucide-react"

// P0 scaffold — empty shell. The tree (left), detail panel (right), add flow,
// and live-polling are added in P1–P9, mirroring /architecture and
// /development-steps. Filesystem-backed (PATTERNS/), no DB.
export function PatternsApp() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex items-center gap-3">
          <Blocks size={20} className="text-amber-500" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Patterns &amp; Anti-patterns</h1>
            <p className="text-sm text-muted-foreground">
              Reusable code examples the AI reuses while building, plus deployment anti-patterns it reads
              before deploying. Stored as real files under <code className="font-mono">PATTERNS/</code>.
            </p>
          </div>
        </header>

        <div className="mt-10 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          The pattern tree and editor are coming online.
        </div>
      </div>
    </main>
  )
}
