"use client"

import { useState } from "react"
import { Plus, Loader2, FolderTree, Lock } from "lucide-react"
import { wordCount } from "@/lib/architecture/projects"

// Right-section panel for the permanent "Projects" folder. No danger zone — the
// container cannot be deleted. Lists ALL projects from the tree (seed + declared)
// and adds new ones; names need at least three words (§3.12).
export function ProjectsPanel({
  listed, onChanged,
}: {
  listed: { label: string; slug: string; description?: string | null }[]
  onChanged?: () => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const ok = wordCount(name) >= 3

  async function add() {
    if (!ok) { setError("A project name needs at least three words."); return }
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setError(d?.error ?? "Could not create — try again")
        return
      }
      setName(""); setDescription("")
      onChanged?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-5">
        <div className="flex items-center gap-1.5 text-foreground">
          <FolderTree size={14} className="text-amber-500" />
          <h2 className="text-base font-bold">Projects</h2>
          <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-foreground/30 px-2 py-0.5 text-[10px] font-semibold text-foreground/70">
            <Lock size={9} /> permanent
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">
          Independent lines of work this one workspace runs — a site, a procurement tracker, a
          language course, a sales automation. Keeping them separate stops them mixing, at no extra
          token or infrastructure cost. Everything outside this folder is the default project; this
          folder lists only the additional projects and cannot be deleted.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Projects</p>
        {listed.length === 0 ? (
          <p className="mt-2 text-xs text-foreground/60">No projects yet — add one below.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {listed.map(p => (
              <li key={p.slug} className="flex flex-col gap-0.5 text-xs text-foreground">
                <div className="flex items-center gap-2">
                  <FolderTree size={11} className="text-amber-500" />
                  <span className="font-semibold">{p.label}</span>
                  <span className="font-mono text-[10px] text-foreground/60">/project/{p.slug}</span>
                </div>
                {p.description && <p className="pl-[19px] text-[11px] text-foreground/70">{p.description}</p>}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">New project</label>
          <p className="mb-2 mt-0.5 text-[11px] text-foreground/70">
            Use at least three words — specific names cut search-ambiguity for the agent.
          </p>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            placeholder="e.g. north region sales automation"
            className="h-8 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Description (optional) — what this project is, so an agent can match a task to it with certainty."
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={add}
            disabled={saving || !ok}
            className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Add project
          </button>
          {error && <span className="mt-1 block text-[11px] font-medium text-red-600">{error}</span>}
        </div>
      </div>
    </div>
  )
}
