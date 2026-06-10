"use client"

import { useState } from "react"
import { reqHref, type Requested } from "@/lib/architecture/requested-tree"
import { RouteTodo } from "./route-todo.client"
import { RouteDangerZone } from "./route-danger-zone.client"

// Right-section view for a declared-but-not-built page / project / endpoint. It
// is a folder with a (placeholder) page; like any page it carries an editable
// to-do list and a danger zone, so its tasks can be seen and fixed. Tasks live
// in route_tasks keyed by this declared route's path (seeded at creation).
export function RequestedDetailPanel({ item, onChanged }: { item: Requested; onChanged?: () => void }) {
  const path = reqHref(item)
  const [bump, setBump] = useState(0)
  function handleChanged() { setBump(b => b + 1); onChanged?.() }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-5">
        <span className="rounded-full border border-amber-500/50 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-600">
          {item.status}
        </span>
        <div className="mt-1.5 flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{item.title}</p>
          <span className="rounded border border-border px-1.5 font-mono text-[9px] font-semibold text-foreground/70">
            {item.kind === "api" ? "endpoint" : item.dynamic ? "dynamic" : "static"}
          </span>
        </div>
        <p className="font-mono text-[10px] text-foreground/60">{path}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="text-xs leading-relaxed text-foreground/80">
          A declared route — not built yet. An agent picks up the tasks below, plans
          and builds it; once live it becomes a real route in this map.
        </p>

        {item.query.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground">Query params</p>
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

        {/* Editable to-do + danger zone — same as a built page, keyed by path. */}
        <RouteTodo path={path} onChanged={handleChanged} reloadSignal={bump} />
        <RouteDangerZone path={path} onChanged={handleChanged} />
      </div>
    </div>
  )
}
