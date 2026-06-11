"use client"

import { useState } from "react"
import { X, Loader2 } from "lucide-react"
import type { Pattern } from "@/lib/patterns/pattern-format"
import { SegToggle } from "@/components/ui/seg-toggle.client"

type Category = { slug: string; label: string }

// Right-side panel opened by "Add pattern" / "Add anti-pattern", mirroring the
// architecture DeclarePanel: you don't describe how it should look — you name it
// (and, for a pattern, pick a category). It becomes a markdown file under PATTERNS/
// with status "declared", which renders amber + (req) until an agent fills it in.
export function AddPatternForm({
  kind, categories, onClose, onCreated,
}: {
  kind: "patterns" | "anti"
  categories: Category[]
  onClose: () => void
  onCreated: (p: Pattern) => void
}) {
  const isAnti = kind === "anti"
  const [name, setName] = useState("")
  const [category, setCategory] = useState(categories[0]?.slug ?? "ui-elements")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function declare() {
    if (!name.trim()) { setError("A name is required"); return }
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: isAnti ? "anti" : "pattern", name: name.trim(), category: isAnti ? "" : category }),
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
      <p className="rounded-md border border-border bg-muted/30 px-3 py-1.5 text-[11px] leading-relaxed text-foreground/70">
        You don&apos;t describe how it looks — just name it. An agent generates it later. It appears now as a
        requested entry (amber, with a (req) badge).
      </p>

      {!isAnti && (
        <div className="flex items-center justify-between gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Category</label>
          <SegToggle<string>
            options={categories.map(c => ({ value: c.slug, label: c.label }))}
            value={category}
            onChange={setCategory}
          />
        </div>
      )}

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
