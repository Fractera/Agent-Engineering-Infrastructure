"use client"

import { useState } from "react"
import { ArrowUpRight, ChevronRight } from "lucide-react"
import type { RouteMeta } from "@/lib/architecture/route-meta"
import { buildMetaSections } from "@/lib/architecture/route-meta-rows"
import { RouteTodo } from "./route-todo.client"
import { RouteDangerZone } from "./route-danger-zone.client"

// Right ~50% panel for the /architecture route tree. Header (status + path +
// "Open page" top-right), the real RouteMeta descriptor as a collapsible
// accordion (compact by default), then the native to-do list and the danger
// zone — a page is a living thing whose settings keep being updated.
function statusClass(s: string): string {
  if (s === "live") return "border-green-500/50 text-green-500"
  if (s === "requested") return "border-amber-500/50 text-amber-600"
  if (s === "wip") return "border-blue-500/50 text-blue-600"
  return "border-border text-foreground/70"
}

export function RouteDetailPanel({ meta, onChanged }: { meta: RouteMeta; onChanged?: () => void }) {
  const sections = buildMetaSections(meta)
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
      <div className="flex items-start justify-between gap-3 border-b border-border p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-foreground/30 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground">{meta.kind}</span>
            <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${statusClass(meta.status)}`}>{meta.status}</span>
          </div>
          <p className="mt-1.5 truncate font-mono text-sm font-semibold text-foreground">{meta.path}</p>
          <p className="truncate font-mono text-[10px] text-foreground/60">{meta.filePath}</p>
        </div>
        {meta.kind === "page" && (
          <a
            href={meta.path}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-foreground/40 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
          >
            Open page <ArrowUpRight size={12} />
          </a>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="text-sm leading-relaxed text-foreground">{meta.description}</p>

        {/* RouteMeta as a compact accordion */}
        <div className="mt-5 flex flex-col gap-1.5">
          {sections.map(s => {
            const isOpen = open.has(s.title)
            return (
              <div key={s.title} className="overflow-hidden rounded-lg border border-border">
                <button
                  onClick={() => toggle(s.title)}
                  className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-muted/60"
                >
                  <span>{s.title}</span>
                  <ChevronRight size={12} className={`text-foreground/70 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </button>
                {isOpen && (
                  <div className="border-t border-border">
                    {s.rows.map(([k, v], i) => (
                      <div
                        key={k}
                        className={`flex items-start justify-between gap-4 px-3 py-1.5 text-xs ${i < s.rows.length - 1 ? "border-b border-border" : ""}`}
                      >
                        <span className="shrink-0 text-foreground/70">{k}</span>
                        <span className="break-all text-right font-mono font-medium text-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Native to-do + danger zone — settings that keep being updated */}
        <RouteTodo path={meta.path} onChanged={onChanged} />
        <RouteDangerZone path={meta.path} onChanged={onChanged} />
      </div>
    </div>
  )
}
