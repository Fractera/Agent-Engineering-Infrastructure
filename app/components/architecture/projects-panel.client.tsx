"use client"

import { useState } from "react"
import { Plus, Loader2, FolderTree, Lock } from "lucide-react"
import { DEFAULT_PROJECT, wordCount, type Project } from "@/lib/architecture/projects"

// Right-section panel for the permanent "Projects" folder (and project nodes).
// No danger zone — the Projects container cannot be deleted. Lists projects and
// adds new ones; names need at least three words (§3.12).
export function ProjectsPanel({
  projects, onChanged,
}: {
  projects: Project[]
  onChanged?: () => void
}) {
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const named = projects.filter(p => (p.slug ?? p.name) !== DEFAULT_PROJECT && p.name !== DEFAULT_PROJECT)
  const ok = wordCount(name) >= 3

  async function add() {
    if (!ok) { setError("A project name needs at least three words."); return }
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setError(d?.error ?? "Could not create — try again")
        return
      }
      setName("")
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
          token or infrastructure cost. This folder cannot be deleted.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Projects</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          <li className="flex items-center gap-2 text-xs text-foreground">
            <span className="text-foreground/60">•</span>
            <span className="font-semibold">{DEFAULT_PROJECT}</span>
            <span className="font-mono text-[10px] text-foreground/60">— holds everything today</span>
          </li>
          {named.map(p => (
            <li key={p.id} className="flex items-center gap-2 text-xs text-foreground">
              <span className="text-foreground/60">•</span>
              <span className="font-semibold">{p.name}</span>
              {p.slug && <span className="font-mono text-[10px] text-foreground/60">/{p.slug}</span>}
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">New project</label>
          <p className="mb-2 mt-0.5 text-[11px] text-foreground/70">
            Use at least three words — specific names cut search-ambiguity for the agent.
          </p>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && add()}
              placeholder="e.g. north region sales automation"
              className="h-8 flex-1 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={add}
              disabled={saving || !ok}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Add
            </button>
          </div>
          {error && <span className="mt-1 block text-[11px] font-medium text-red-600">{error}</span>}
        </div>
      </div>
    </div>
  )
}
