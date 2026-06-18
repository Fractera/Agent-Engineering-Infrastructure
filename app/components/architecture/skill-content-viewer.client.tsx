"use client"

import { useEffect, useState } from "react"

type State =
  | { phase: "loading" }
  | { phase: "ready"; content: string; path: string | null }
  | { phase: "empty"; note: string }

// Lazily loads and shows the full text of one skill file (SKILL.md) in the /ai-core
// detail panel, when a skill leaf is selected. Read-only — it only GETs the content API.
// Kept out of DetailPanel so the panel stays a thin presentational component.
export function SkillContentViewer({ agent, name }: { agent: string; name: string }) {
  const [state, setState] = useState<State>({ phase: "loading" })

  useEffect(() => {
    let alive = true
    setState({ phase: "loading" })
    fetch(`/api/ai-core/skill?agent=${encodeURIComponent(agent)}&name=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(d => {
        if (!alive) return
        if (d?.readable && typeof d.content === "string") setState({ phase: "ready", content: d.content, path: d.path ?? null })
        else setState({ phase: "empty", note: d?.note ?? "The skill file is not reachable." })
      })
      .catch(() => { if (alive) setState({ phase: "empty", note: "Could not load the skill file." }) })
    return () => { alive = false }
  }, [agent, name])

  if (state.phase === "loading") {
    return <p className="font-mono text-[11px] text-foreground/50">Loading skill…</p>
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
