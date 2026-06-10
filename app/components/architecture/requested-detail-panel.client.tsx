"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import type { QueryParam } from "@/lib/architecture/requested-tree"
import { RouteTodo } from "./route-todo.client"
import { RouteDangerZone } from "./route-danger-zone.client"
import { RouteSource } from "./route-source.client"

// Right-section panel for a declared-but-not-built route — a page, an endpoint,
// or a project (folder + page). Like any route it carries an editable to-do, a
// danger zone, and a Source view (a blank virtual file the user can paste an
// example into → a code-change request the agent uses when building). Tasks live
// in route_tasks keyed by this route's path.
export function RequestedDetailPanel({
  title, path, kind, dynamic = false, query = [], onChanged,
}: {
  title: string
  path: string
  kind: "page" | "api"
  dynamic?: boolean
  query?: QueryParam[]
  onChanged?: () => void
}) {
  const [bump, setBump] = useState(0)
  const [srcOpen, setSrcOpen] = useState(false)
  function handleChanged() { setBump(b => b + 1); onChanged?.() }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-5">
        <span className="rounded-full border border-amber-500/50 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-600">
          requested
        </span>
        <div className="mt-1.5 flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <span className="rounded border border-border px-1.5 font-mono text-[9px] font-semibold text-foreground/70">
            {kind === "api" ? "endpoint" : dynamic ? "dynamic" : "static"}
          </span>
        </div>
        <p className="font-mono text-[10px] text-foreground/60">{path}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="text-xs leading-relaxed text-foreground/80">
          A declared route — not built yet. An agent picks up the tasks below, plans
          and builds it; once live it becomes a real route in this map.
        </p>

        {query.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground">Query params</p>
            <ul className="flex flex-col gap-1">
              {query.map((q, i) => (
                <li key={i} className="font-mono text-xs text-foreground">
                  <span className="font-semibold">{q.key}</span>
                  <span className="text-foreground/50"> = </span>
                  <span>{q.value || "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Source accordion above the to-do — paste an example for the agent. */}
        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          <button
            onClick={() => setSrcOpen(v => !v)}
            className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-muted/60"
          >
            <span>Source</span>
            <ChevronRight size={12} className={`text-foreground/70 transition-transform ${srcOpen ? "rotate-90" : ""}`} />
          </button>
          {srcOpen && (
            <div className="border-t border-border p-3">
              <RouteSource path={path} onChanged={handleChanged} />
            </div>
          )}
        </div>

        {/* Editable to-do + danger zone, keyed by path. */}
        <RouteTodo path={path} onChanged={handleChanged} reloadSignal={bump} />
        <RouteDangerZone path={path} onChanged={handleChanged} />
      </div>
    </div>
  )
}
