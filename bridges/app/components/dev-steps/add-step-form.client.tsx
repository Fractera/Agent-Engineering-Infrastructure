"use client"

import { useState } from "react"
import { X, Loader2 } from "lucide-react"
import { ImportanceToggle } from "./importance-toggle.client"
import type { Importance, Step } from "@/lib/dev-steps/step-file"

// Right-side form opened by "Add step". Declares a new development step — a name
// plus its importance (optional / mandatory / critical). Nothing is built here; it
// becomes a markdown file under DEVELOPMENT-STEPS/NEW-STEPS/ that an agent reads.
export function AddStepForm({
  onClose, onCreated,
}: {
  onClose: () => void
  onCreated: (s: Step) => void
}) {
  const [name, setName] = useState("")
  const [importance, setImportance] = useState<Importance>("optional")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function create() {
    if (!name.trim()) { setError("A step name is required"); return }
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/development-steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), importance }),
      })
      if (!res.ok) { setError("Could not save — try again"); return }
      const { step } = await res.json()
      if (step) onCreated(step)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Add a step</h2>
        <button onClick={onClose} className="text-foreground/60 transition-colors hover:text-foreground">
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Step name</label>
        <input
          type="text"
          placeholder="e.g. Add Telegram reminder ingestion"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && create()}
          className="h-8 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {error && <span className="text-[11px] font-medium text-red-600">{error}</span>}
      </div>

      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Importance</label>
        <ImportanceToggle value={importance} onChange={setImportance} />
      </div>

      <button
        onClick={create}
        disabled={saving || !name.trim()}
        className="inline-flex h-8 items-center justify-center gap-1.5 self-start rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {saving && <Loader2 size={11} className="animate-spin" />}
        Add step
      </button>
    </div>
  )
}
