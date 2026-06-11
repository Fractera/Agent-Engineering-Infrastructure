"use client"

import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"

// The collapsible accordion item used across /architecture (RouteDetailPanel) and
// /development-steps (StepDetail): a bordered card with an uppercase header + a
// rotating chevron and a collapsible body. Extracted here so the three pattern
// sections (Source code example · Steps · Danger zone) read as one accordion.
// Controlled — the parent owns open state so several items can be open at once.
export function AccordionItem({
  title, open, onToggle, children, tone = "default",
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
  tone?: "default" | "danger"
}) {
  const danger = tone === "danger"
  return (
    <div className={`overflow-hidden rounded-lg border ${danger ? "border-red-500/40" : "border-border"}`}>
      <button
        onClick={onToggle}
        className={`flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors hover:bg-muted/60 ${danger ? "text-red-600" : "text-foreground"}`}
      >
        <span>{title}</span>
        <ChevronRight size={12} className={`transition-transform ${danger ? "text-red-600/70" : "text-foreground/70"} ${open ? "rotate-90" : ""}`} />
      </button>
      {open && <div className="border-t border-border p-3">{children}</div>}
    </div>
  )
}
