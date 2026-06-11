"use client"

// AI Draft Settings — a filesystem-backed intermediate layer, mirroring /architecture
// and /patterns but in a STATIC mode (no live polling, no blink, no auto-reveal). The
// architect writes free-form wishes here — to supplement or replace the real files that
// drive the six agents (Hermes + the five coding platforms). The wishes live as drafts
// under AI-DRAFT-SETTINGS/ in the project root; an agent reads them later and applies the
// changes to the real instruction / skill / MCP files. The originals are never touched
// from here — this is a mirror you work on, not the source.
//
// S1: route shell — header, the layer description and the empty two-column frame.
// The left tree, the [+ Add to: …] button and the right detail panel are wired in the
// next sub-steps.

const DESCRIPTION =
  "A staging layer between you and the files that drive your agents. Here the architect " +
  "writes wishes in free form — new instructions, skills or connectors, or changes to the " +
  "existing ones — without editing the real files. You describe what you want (to supplement " +
  "or to replace), then ask the AI to turn these notes into the real documents and place them " +
  "where they belong. You work only on this mirror; an agent applies it to the originals."

export function AiDraftApp() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <a href="/" className="font-mono text-xs text-foreground/70 transition-colors hover:text-foreground">← back</a>
        <h1 className="mt-1 text-xl font-bold text-foreground">AI draft settings</h1>
        <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-foreground/80">{DESCRIPTION}</p>

        <div className="mt-4 overflow-x-auto">
          <div className="flex h-[72vh] min-w-[720px] overflow-hidden rounded-xl border border-border">
            <div className="flex w-1/2 flex-col border-r border-border bg-muted/10">
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">Agents</span>
              </div>
              <div className="flex-1 overflow-y-auto" />
            </div>
            <div className="w-1/2 overflow-y-auto">
              <div className="flex h-full items-center justify-center p-10 text-center">
                <p className="max-w-xs text-xs text-foreground/60">
                  Select an agent document, skill or MCP on the left.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
