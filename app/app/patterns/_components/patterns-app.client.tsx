"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { Pattern } from "@/lib/patterns/pattern-format"
import { SegToggle } from "@/components/ui/seg-toggle.client"
import { PollBar } from "@/components/architecture/poll-bar.client"
import { PatternTree } from "@/components/patterns/pattern-tree.client"
import { PatternDetail } from "@/components/patterns/pattern-detail.client"

type Mode = "patterns" | "anti"
type Category = { slug: string; label: string; patterns: Pattern[] }
type Sig = Record<string, string>

// Patterns & Anti-patterns — a filesystem-backed reuse library, mirroring
// /architecture and /development-steps. One header switch (Patterns | Anti-patterns,
// default Patterns) flips both the description and the left column: Patterns shows a
// one-level category tree, Anti-patterns shows a flat list. Left = the tree/list;
// right = the opened entry. Built incrementally — P2 renders the tree + selection.

const COPY: Record<Mode, string> = {
  patterns:
    "Reusable code the AI reuses while building — a button style, a whole section, a brandbook rule. " +
    "Filed by category; the model reuses or extends one instead of re-deriving it. You don't spell out how it " +
    "looks — you request it, and an agent fills it in (a requested-but-unbuilt entry shows amber with a (req) badge).",
  anti:
    "Deployment pitfalls the AI reads before it deploys, so it doesn't repeat them. A flat list of mistakes " +
    "that bite during a deploy — each with the guard that avoids it.",
}

export function PatternsApp() {
  const [categories, setCategories] = useState<Category[]>([])
  const [anti, setAnti] = useState<Pattern[]>([])
  const [mode, setMode] = useState<Mode>("patterns")
  const [selected, setSelected] = useState<Pattern | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [blink, setBlink] = useState<Set<string>>(new Set())
  const [hidden, setHidden] = useState(false)

  const prevSig = useRef<Sig>({})
  const seeded = useRef(false)

  function refresh() {
    fetch("/api/patterns/signature")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return
        const cats: Category[] = d.categories ?? []
        setCategories(cats)
        setAnti(d.anti ?? [])
        const sig: Sig = d.signature ?? {}
        if (!seeded.current) {
          // First load: open categories that already hold patterns.
          setExpanded(new Set(cats.filter(c => c.patterns.length).map(c => `cat:${c.slug}`)))
        } else {
          const changed = new Set<string>()
          for (const id of Object.keys(sig)) if (prevSig.current[id] !== sig[id]) changed.add(id)
          if (changed.size) {
            setBlink(changed)
            setTimeout(() => setBlink(new Set()), 3000)
          }
        }
        prevSig.current = sig
        seeded.current = true
      })
      .catch(() => {})
  }
  useEffect(() => { refresh() }, [])

  useEffect(() => {
    const h = () => setHidden(document.hidden)
    document.addEventListener("visibilitychange", h)
    return () => document.removeEventListener("visibilitychange", h)
  }, [])

  // Auto-reveal: a blinking pattern expands its category and scrolls into view.
  useEffect(() => {
    if (!blink.size) return
    const inView = mode === "anti" ? anti : categories.flatMap(c => c.patterns)
    const hit = inView.find(p => blink.has(p.id))
    if (!hit) return
    if (mode === "patterns") setExpanded(prev => new Set([...prev, `cat:${hit.category}`]))
    const t = setTimeout(() => {
      document.getElementById(`patterns-node-${hit.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" })
    }, 120)
    return () => clearTimeout(t)
  }, [blink, mode, categories, anti])

  useEffect(() => { setSelected(null) }, [mode])

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const count = useMemo(() => {
    if (mode === "anti") return `${anti.length} anti-pattern${anti.length === 1 ? "" : "s"}`
    const n = categories.reduce((acc, c) => acc + c.patterns.length, 0)
    return `${categories.length} categories · ${n} pattern${n === 1 ? "" : "s"}`
  }, [mode, anti, categories])

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <a href="/" className="font-mono text-xs text-foreground/70 transition-colors hover:text-foreground">← back</a>
        <h1 className="mt-1 text-xl font-bold text-foreground">Patterns &amp; Anti-patterns</h1>
        <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-foreground/80">{COPY[mode]}</p>

        <div className="mt-4"><PollBar onPoll={refresh} paused={hidden} /></div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] text-foreground/50">{count}</span>
          <SegToggle<Mode>
            options={[{ value: "patterns", label: "Patterns" }, { value: "anti", label: "Anti-patterns" }]}
            value={mode}
            onChange={setMode}
          />
        </div>

        <div className="mt-3 overflow-x-auto">
          <div className="flex h-[72vh] min-w-[720px] overflow-hidden rounded-xl border border-border">
            <div className="flex w-1/2 flex-col border-r border-border bg-muted/10">
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">
                  {mode === "anti" ? "Anti-patterns" : "Patterns"}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <PatternTree
                  mode={mode}
                  categories={categories}
                  anti={anti}
                  selectedId={selected?.id ?? null}
                  expanded={expanded}
                  blink={blink}
                  onSelect={setSelected}
                  onToggle={toggle}
                />
              </div>
            </div>
            <div className="w-1/2 overflow-y-auto">
              {selected ? (
                <PatternDetail
                  pattern={selected}
                  categoryLabel={categories.find(c => c.slug === selected.category)?.label ?? selected.category}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-10 text-center">
                  <p className="max-w-xs text-xs text-foreground/60">
                    Select {mode === "anti" ? "an anti-pattern" : "a pattern"} on the left to read it.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
