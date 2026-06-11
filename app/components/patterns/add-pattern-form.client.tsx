"use client"

import { useState } from "react"
import { X, Loader2 } from "lucide-react"
import type { Pattern } from "@/lib/patterns/pattern-format"

// Right-side panel opened by "Add to: <category>" / "Add anti-pattern", mirroring
// the architecture DeclarePanel: the TARGET is decided in the LEFT tree (which
// category is active), shown here read-only as "Adding to: …" — you choose nothing
// on the right. You don't describe how it looks; you name it, and an agent fills it
// in. It becomes a markdown file under PATTERNS/ with status "declared" (amber + req).
export function AddPatternForm({
  kind, categoryLabel, categorySlug, onClose, onCreated,
}: {
  kind: "patterns" | "anti"
  categoryLabel: string
  categorySlug: string
  onClose: () => void
  onCreated: (p: Pattern) => void
}) {
  const isAnti = kind === "anti"
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function declare() {
    if (!name.trim()) { setError("A name is required"); return }
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: isAnti ? "anti" : "pattern", name: name.trim(), category: isAnti ? "" : categorySlug }),
      })
      if (!res.ok) { setError("Could not save — try again"); return }
      const { pattern } = await res.json()
      if (pattern) onCreated(pattern)
      setName("")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">{isAnti ? "Add an anti-pattern" : "Add a pattern"}</h2>
        <button onClick={onClose} className="text-foreground/60 transition-colors hover:text-foreground">
          <X size={14} />
        </button>
      </div>

      {!isAnti && (
        <p className="rounded-md border border-border bg-muted/30 px-3 py-1.5 font-mono text-[11px] text-foreground">
          Adding to: <span className="font-semibold">{categoryLabel}</span>
        </p>
      )}
      <p className="rounded-md border border-border bg-muted/30 px-3 py-1.5 text-[11px] leading-relaxed text-foreground/70">
        You don&apos;t describe how it looks — just name it. An agent generates it later. It appears now as a
        requested entry (amber, with a (req) badge).
      </p>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
          {isAnti ? "Anti-pattern name" : "Pattern name"}
        </label>
        <input
          type="text"
          placeholder={isAnti ? "e.g. Premature reset" : "e.g. Primary button"}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && declare()}
          className="h-8 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {error && <span className="text-[11px] font-medium text-red-600">{error}</span>}
      </div>

      <button
        onClick={declare}
        disabled={saving || !name.trim()}
        className="inline-flex h-8 items-center justify-center gap-1.5 self-start rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {saving && <Loader2 size={11} className="animate-spin" />}
        {isAnti ? "Declare anti-pattern" : "Declare pattern"}
      </button>
    </div>
  )
}
