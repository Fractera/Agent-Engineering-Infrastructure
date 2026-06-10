"use client"

import type { Requested } from "@/lib/architecture/requested-tree"

// Right-section view for a declared-but-not-built page. Minimal by design: the
// page title top-left, a non-editable to-do list below. No "Open page" — the
// route does not exist yet; an agent builds it from these tasks (§3.11).
export function RequestedDetailPanel({ item }: { item: Requested }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-5">
        <span className="rounded-full border border-amber-500/30 px-2 py-0.5 font-mono text-[10px] text-amber-400">
          {item.status}
        </span>
        <p className="mt-1.5 text-sm font-medium text-foreground">{item.title}</p>
        <p className="font-mono text-[10px] text-muted-foreground/60">/{item.slug}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="text-xs leading-relaxed text-muted-foreground">
          A declared page — not built yet. An agent picks up the tasks below, plans
          and builds it; once live it becomes a real route in this map.
        </p>

        <div className="mt-4">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            To-do (read-only)
          </p>
          {item.todo.length === 0 ? (
            <p className="text-xs text-muted-foreground/60">No tasks listed.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {item.todo.map((t, i) => (
                <li key={i} className="flex gap-1.5 text-xs text-muted-foreground">
                  <span className="text-amber-400/60">•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
