"use client"

import { useState } from "react"
import { X, Loader2 } from "lucide-react"
import type { DraftMode, GroupKind } from "@/lib/ai-draft/draft-format"
import { SegToggle } from "@/components/ui/seg-toggle.client"

// Right-side panel opened by "Add to: <agent> / <SKILLS|MCP>". The TARGET group is
// decided in the LEFT tree (the active group), shown here read-only. You name a NEW
// record and pick supplement / replace; it becomes a draft with no original behind it
// (target null) → orange + (req). To draft over an EXISTING real record instead, select
// that record in the tree and start a draft from there.
export function AddDraftForm({
  agentLabel, kind, onClose, onCreate,
}: {
  agentLabel: string
  kind: GroupKind
  onClose: () => void
  onCreate: (name: string, mode: DraftMode) => Promise<boolean>
}) {
  const noun = kind === "mcp" ? "MCP connector" : "skill"
  const [name, setName] = useState("")
  const [mode, setMode] = useState<DraftMode>("supplement")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function declare() {
    if (!name.trim()) { setError("A name is required"); return }
    setSaving(true); setError("")
    try {
      const ok = await onCreate(name.trim(), mode)
      if (!ok) { setError("Could not save — try again"); return }
      setName("")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Add a {noun}</h2>
        <button onClick={onClose} className="text-foreground/60 transition-colors hover:text-foreground">
          <X size={14} />
        </button>
      </div>

      <p className="rounded-md border border-border bg-muted/30 px-3 py-1.5 font-mono text-[11px] text-foreground">
        Adding to: <span className="font-semibold">{agentLabel} / {kind === "mcp" ? "MCP" : "SKILLS"}</span>
      </p>
      <p className="rounded-md border border-border bg-muted/30 px-3 py-1.5 text-[11px] leading-relaxed text-foreground/70">
        A brand-new {noun} with no original behind it — it appears as a requested entry (amber, with a (req)
        badge). Write the wishes after; an agent turns them into the real file.
      </p>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">{noun} name</label>
        <input
          type="text"
          placeholder={kind === "mcp" ? "e.g. company-calendar" : "e.g. summarize-pr"}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && declare()}
          className="h-8 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {error && <span className="text-[11px] font-medium text-red-600">{error}</span>}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/60">Apply as</span>
        <SegToggle<DraftMode>
          options={[{ value: "supplement", label: "Supplement" }, { value: "replace", label: "Replace" }]}
          value={mode}
          onChange={setMode}
        />
      </div>

      <button
        onClick={declare}
        disabled={saving || !name.trim()}
        className="inline-flex h-8 items-center justify-center gap-1.5 self-start rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {saving && <Loader2 size={11} className="animate-spin" />}
        Declare {noun}
      </button>
    </div>
  )
}
