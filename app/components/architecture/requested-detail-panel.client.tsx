"use client"

import { reqHref, type Requested } from "@/lib/architecture/requested-tree"

// Right-section view for a declared-but-not-built page. Minimal by design: the
// page title top-left, a non-editable to-do list below. No "Open page" — the
// route does not exist yet; an agent builds it from these tasks (§3.11).
export function RequestedDetailPanel({ item }: { item: Requested }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-5">
        <span className="rounded-full border border-amber-500/50 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-600">
          {item.status}
        </span>
        <div className="mt-1.5 flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{item.title}</p>
          <span className="rounded border border-border px-1.5 font-mono text-[9px] font-semibold text-foreground/70">
            {item.dynamic ? "dynamic" : "static"}
          </span>
        </div>
        <p className="font-mono text-[10px] text-foreground/60">{reqHref(item)}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="text-xs leading-relaxed text-foreground/80">
          A declared page — not built yet. An agent picks up the tasks below, plans
          and builds it; once live it becomes a real route in this map.
        </p>

        {item.query.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground">
              Query params
            </p>
            <ul className="flex flex-col gap-1">
              {item.query.map((q, i) => (
                <li key={i} className="font-mono text-xs text-foreground">
                  <span className="font-semibold">{q.key}</span>
                  <span className="text-foreground/50"> = </span>
                  <span>{q.value || "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground">
            To-do (read-only)
          </p>
          {item.todo.length === 0 ? (
            <p className="text-xs text-foreground/60">No tasks listed.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {item.todo.map((t, i) => (
                <li key={i} className="flex gap-1.5 text-xs text-foreground">
                  <span className="text-amber-600/70">•</span>
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
