"use client"

import { useState } from "react"
import { Loader2, FileSymlink } from "lucide-react"
import type { DraftMode, GroupKind } from "@/lib/ai-draft/draft-format"
import { SegToggle } from "@/components/ui/seg-toggle.client"

// Read-only panel shown when a REAL original (a live skill / MCP server) with no draft
// yet is selected. It explains that the original is never edited here, and offers to
// start a draft over it — supplement or replace — which becomes an editable overlay
// (black name + req badge once it has wishes).
export function ReferenceDetail({
  kind, label, onCreate,
}: {
  agentId: string
  kind: GroupKind
  name: string
  label: string
  onCreate: (mode: DraftMode) => Promise<void>
}) {
  const noun = kind === "mcp" ? "MCP connector" : "skill"
  const [mode, setMode] = useState<DraftMode>("supplement")
  const [creating, setCreating] = useState(false)

  async function create() {
    setCreating(true)
    try { await onCreate(mode) } finally { setCreating(false) }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-foreground/50">Real {noun}</span>
          <span className="font-mono text-[9px] uppercase tracking-wide text-foreground/40">read-only</span>
        </div>
        <h2 className="mt-1.5 text-sm font-bold text-foreground">{label}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-foreground/70">
          This is a real {noun} the agent already loads, mirrored here for reference. The original is never
          edited from this page. Start a draft to record what you want changed — an agent applies it to the
          real file later.
        </p>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/60">Apply as</span>
          <SegToggle<DraftMode>
            options={[{ value: "supplement", label: "Supplement" }, { value: "replace", label: "Replace" }]}
            value={mode}
            onChange={setMode}
          />
        </div>

        <button
          onClick={create}
          disabled={creating}
          className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {creating ? <Loader2 size={11} className="animate-spin" /> : <FileSymlink size={12} />}
          Start draft over this {noun}
        </button>
      </div>
    </div>
  )
}
