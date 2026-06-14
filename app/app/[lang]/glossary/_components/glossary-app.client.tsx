"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Trash2, Loader2, ArrowRight } from "lucide-react"
import { toast } from "sonner"

type Entry = { term: string; meaning: string }

// The workspace glossary editor (step 107). Approve abbreviations / preferred
// phrasings so every agent reads them the same way and avoids mistakes —
// e.g. "aws" → "ai-workspace". Left = key/abbreviation, right = value/meaning.
// Persisted in app.db (glossary); an agent later exports/ingests it into Company
// Brain. Public page (temporarily).
export function GlossaryApp() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [term, setTerm] = useState("")
  const [meaning, setMeaning] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  const load = useCallback(async () => {
    const res = await fetch("/api/glossary")
    if (res.ok) setEntries((await res.json()).entries ?? [])
  }, [])
  useEffect(() => { load() }, [load])

  async function add() {
    if (!term.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/glossary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: term.trim(), meaning: meaning.trim() }),
      })
      if (!res.ok) throw new Error("Failed to save")
      const data = await res.json()
      setEntries(data.entries ?? [])
      setTerm(""); setMeaning("")
    } catch (e) {
      toast.error(String(e))
    } finally {
      setSaving(false)
    }
  }

  async function remove(index: number) {
    setDeleting(index)
    try {
      const res = await fetch(`/api/glossary?index=${index}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      const data = await res.json()
      setEntries(data.entries ?? [])
    } catch (e) {
      toast.error(String(e))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <a href="/" className="font-mono text-xs text-foreground/70 transition-colors hover:text-foreground">
          ← back
        </a>
        <h1 className="mt-2 text-xl font-bold text-foreground">Glossary</h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-foreground/80">
          Define the abbreviations and preferred phrasings your project should understand, to avoid
          mistakes — typos, or words an agent could read the wrong way. For example, if you often use
          the phrase <span className="font-mono font-semibold text-foreground">ai-workspace</span>, that is long
          to type, so approve a short form <span className="font-mono font-semibold text-foreground">aws</span> →
          <span className="font-mono font-semibold text-foreground"> ai-workspace</span>. After that you can use the
          short form with any AI agent in your project and it will be understood the same way.
        </p>

        {/* Physical location — where the glossary lives for agents to read. */}
        <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">Where it lives</p>
          <p className="mt-1 font-mono text-xs font-semibold text-foreground">GLOSSARY.md</p>
          <p className="mt-1 text-[11px] leading-relaxed text-foreground/70">
            A real file at the project root — the same level as the agent context files
            (<span className="font-mono">CLAUDE.md</span>, <span className="font-mono">AGENTS.md</span>,
            <span className="font-mono"> GEMINI.md</span>, <span className="font-mono">QWEN.md</span>) and the base
            Next.js files. Editing here writes this file directly, so every agent reads it as project context.
          </p>
        </div>

        {/* Add row */}
        <div className="mt-6 flex flex-wrap items-stretch gap-2 rounded-xl border border-border bg-muted/20 p-3">
          <input
            value={term}
            onChange={e => setTerm(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            placeholder="key / abbreviation (e.g. aws)"
            className="h-9 min-w-[160px] flex-1 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="flex items-center text-foreground/50"><ArrowRight size={14} /></span>
          <input
            value={meaning}
            onChange={e => setMeaning(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            placeholder="value / meaning (e.g. ai-workspace)"
            className="h-9 min-w-[200px] flex-[2] rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={add}
            disabled={saving || !term.trim()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Add
          </button>
        </div>

        {/* Rows */}
        {entries.length === 0 ? (
          <p className="mt-6 text-center text-xs text-foreground/60">No terms yet — add the first above.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            {entries.map((e, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-2.5 text-xs ${i < entries.length - 1 ? "border-b border-border" : ""}`}
              >
                <span className="w-1/3 shrink-0 break-all font-mono font-semibold text-foreground">{e.term}</span>
                <ArrowRight size={12} className="shrink-0 text-foreground/40" />
                <span className="flex-1 break-all text-foreground/90">{e.meaning || "—"}</span>
                <button
                  onClick={() => remove(i)}
                  disabled={deleting === i}
                  className="shrink-0 text-foreground/50 transition-colors hover:text-red-600 disabled:opacity-40"
                >
                  {deleting === i ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 text-[10px] font-mono text-foreground/50">
          {entries.length} term{entries.length !== 1 ? "s" : ""} · stored in your workspace · read by your agents
        </p>
      </div>
    </main>
  )
}
