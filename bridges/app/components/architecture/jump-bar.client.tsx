"use client"

import { useMemo, useState } from "react"
import { RotateCcw, Search } from "lucide-react"
import type { FlatEntry } from "@/lib/architecture/flatten"

type Props = {
  entries: FlatEntry[]          // every node except the root
  activeId: string | null
  onJump: (entry: FlatEntry) => void
  onReset: () => void
}

// Quick-jump bar above the title: type to filter, then click an entity chip to
// animate the tree open straight to it. "Where is Hermes?" → one click.
export function JumpBar({ entries, activeId, onJump, onReset }: Props) {
  const [q, setQ] = useState("")

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return entries
    return entries.filter(
      e => e.chip.toLowerCase().includes(needle) || e.node.label.toLowerCase().includes(needle),
    )
  }, [q, entries])

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/60" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Jump to… (type to filter)"
            className="h-8 w-full rounded-md border border-border bg-background pl-7 pr-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <button
          onClick={onReset}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      <div className="flex max-h-[280px] flex-wrap gap-1.5 overflow-y-auto pr-1">
        {shown.map(e => (
          <button
            key={e.node.id}
            onClick={() => onJump(e)}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
              activeId === e.node.id
                ? "border-primary/40 bg-primary/15 text-foreground"
                : "border-border bg-background text-foreground/80 hover:border-primary/30 hover:text-foreground"
            }`}
          >
            {e.chip}
          </button>
        ))}
        {shown.length === 0 && (
          <span className="px-1 py-1 text-[11px] text-foreground/60">No match</span>
        )}
      </div>
    </div>
  )
}
