"use client"

import { useEffect, useState } from "react"

type State =
  | { phase: "loading" }
  | { phase: "ready"; content: string; path: string | null }
  | { phase: "empty"; note: string }

// Lazily loads and shows the full text of the real file behind a /ai-core node — a skill
// (SKILL.md) or an instruction doc (CLAUDE.md / SOUL.md …, kind="instruction") — so the
// panel shows the ACTUAL content, not a canned description. Read-only — only GETs the
// content API. Kept out of DetailPanel so the panel stays a thin presentational component.
export function SkillContentViewer(
  { agent, name, kind = "skill" }: { agent: string; name: string; kind?: "skill" | "instruction" },
) {
  const [state, setState] = useState<State>({ phase: "loading" })

  useEffect(() => {
    let alive = true
    setState({ phase: "loading" })
    fetch(`/api/ai-core/skill?agent=${encodeURIComponent(agent)}&name=${encodeURIComponent(name)}&kind=${kind}`)
      .then(r => r.json())
      .then(d => {
        if (!alive) return
        if (d?.readable && typeof d.content === "string") setState({ phase: "ready", content: d.content, path: d.path ?? null })
        else setState({ phase: "empty", note: d?.note ?? "The file is not reachable." })
      })
      .catch(() => { if (alive) setState({ phase: "empty", note: "Could not load the file." }) })
    return () => { alive = false }
  }, [agent, name, kind])

  if (state.phase === "loading") {
    return <p className="font-mono text-[11px] text-foreground/50">Loading…</p>
  }
  if (state.phase === "empty") {
    return <p className="text-xs leading-relaxed text-foreground/60">{state.note}</p>
  }
  return (
    <div className="flex flex-col gap-1">
      {state.path && <span className="font-mono text-[10px] text-foreground/40">{state.path}</span>}
      <pre className="max-h-[48vh] overflow-auto rounded-lg border border-border bg-muted/20 p-3 font-mono text-[11px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
        {state.content}
      </pre>
    </div>
  )
}
