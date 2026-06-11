"use client"

import { ChevronRight, Folder, FolderOpen, FileCode, FileWarning } from "lucide-react"
import type { Pattern } from "@/lib/patterns/pattern-format"

// Left tree for /patterns, copying the architecture tree-view conventions: chevron
// folders, amber `declared` label, (req) badge for `pending`, ptnBlink 3×1s, and
// ptnReveal on expand. Patterns are a one-level tree (category folder → pattern
// leaf); anti-patterns are a flat list. DOM id `patterns-node-<id>` drives the
// auto-reveal/scroll on each poll tick (same model as /architecture).

type Category = { slug: string; label: string; patterns: Pattern[] }

type Props = {
  mode: "patterns" | "anti"
  categories: Category[]
  anti: Pattern[]
  selectedId: string | null
  activeCat: string
  expanded: Set<string>
  blink: Set<string>
  onSelect: (p: Pattern) => void
  onSelectCategory: (slug: string) => void
  onToggle: (id: string) => void
}

const KEYFRAMES =
  "@keyframes ptnBlink{0%,100%{background-color:transparent}50%{background-color:rgb(245 158 11 / 0.35)}}" +
  "@keyframes ptnReveal{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}"

function Leaf({ p, selectedId, blink, onSelect, depth, Icon }: {
  p: Pattern; selectedId: string | null; blink: Set<string>
  onSelect: (p: Pattern) => void; depth: number; Icon: typeof FileCode
}) {
  const isBlinking = blink.has(p.id)
  return (
    <button
      id={`patterns-node-${p.id}`}
      onClick={() => onSelect(p)}
      style={{ paddingLeft: depth * 16 + 8, animation: isBlinking ? "ptnBlink 1s ease-in-out 3" : undefined }}
      className={`flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-xs transition-colors ${
        selectedId === p.id ? "bg-primary/15 text-foreground" : "text-foreground hover:bg-muted/60"
      }`}
    >
      <span className="h-3.5 w-3.5 shrink-0" />
      <Icon size={13} className="shrink-0 text-foreground/60" />
      <span className={`ml-0.5 truncate font-semibold ${p.declared ? "text-amber-600" : "text-foreground"}`}>{p.name}</span>
      {p.pending && (
        <span className="ml-1 shrink-0 rounded-full border border-amber-500/50 px-1.5 font-mono text-[9px] font-semibold text-amber-600">req</span>
      )}
    </button>
  )
}

export function PatternTree({ mode, categories, anti, selectedId, activeCat, expanded, blink, onSelect, onSelectCategory, onToggle }: Props) {
  if (mode === "anti") {
    return (
      <div className="py-2">
        <style>{KEYFRAMES}</style>
        {anti.length === 0
          ? <p className="px-4 py-3 text-xs text-foreground/50">No anti-patterns yet.</p>
          : anti.map(p => <Leaf key={p.id} p={p} selectedId={selectedId} blink={blink} onSelect={onSelect} depth={0} Icon={FileWarning} />)}
      </div>
    )
  }

  return (
    <div className="py-2">
      <style>{KEYFRAMES}</style>
      {categories.map(cat => {
        const id = `cat:${cat.slug}`
        const isOpen = expanded.has(id)
        const catBlink = !isOpen && cat.patterns.some(p => blink.has(p.id))
        const isActive = activeCat === cat.slug && !selectedId
        return (
          <div key={id}>
            <button
              id={`patterns-node-${id}`}
              onClick={() => { onSelectCategory(cat.slug); onToggle(id) }}
              style={{ animation: catBlink ? "ptnBlink 1s ease-in-out 3" : undefined }}
              className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-foreground transition-colors ${
                isActive ? "bg-primary/15" : "hover:bg-muted/60"
              }`}
            >
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-foreground/60">
                <ChevronRight size={12} className={`transition-transform ${isOpen ? "rotate-90" : ""}`} />
              </span>
              {isOpen
                ? <FolderOpen size={14} className="shrink-0 text-amber-500" />
                : <Folder size={14} className="shrink-0 text-amber-500" />}
              <span className="ml-0.5 truncate font-semibold">{cat.label}</span>
              <span className="ml-auto shrink-0 font-mono text-[10px] text-foreground/50">{cat.patterns.length}</span>
            </button>
            {isOpen && (
              <div style={{ animation: "ptnReveal .18s ease-out" }}>
                {cat.patterns.length === 0
                  ? <p style={{ paddingLeft: 42 }} className="py-1.5 text-xs text-foreground/40">empty</p>
                  : cat.patterns.map(p => (
                      <Leaf key={p.id} p={p} selectedId={selectedId} blink={blink} onSelect={onSelect} depth={1} Icon={FileCode} />
                    ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
