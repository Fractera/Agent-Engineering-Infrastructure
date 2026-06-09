"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type { ArchNode } from "@/lib/architecture/types"
import { ARCHITECTURE_TREE } from "@/lib/architecture/tree"
import { flattenTree, type FlatEntry } from "@/lib/architecture/flatten"
import { TreeNode } from "@/components/architecture/tree-view.client"
import { DetailPanel } from "@/components/architecture/detail-panel.client"
import { JumpBar } from "@/components/architecture/jump-bar.client"

// Public page. A file-explorer tree (left ~50%) plus a detail panel (right ~50%),
// with a quick-jump bar that animates the tree open to any entity on one click.
// One artefact, equally legible to the human (eyes) and the AI (few tokens).
export default function ArchitecturePage() {
  const [selected, setSelected] = useState<ArchNode | null>(ARCHITECTURE_TREE)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["l2", "nginx", "auth"]))
  const [scrollTarget, setScrollTarget] = useState<{ id: string; n: number } | null>(null)

  // Jump targets: every node except the root and the per-platform boilerplate
  // (each agent's doc/Skills/MCP children) — those repeat five times and are one
  // expand away, so they only add noise to the chip list.
  const entries = useMemo(() => {
    const PLATFORMS = ["claude", "codex", "gemini", "qwen", "kimi"]
    return flattenTree(ARCHITECTURE_TREE).filter(
      e => e.node.id !== ARCHITECTURE_TREE.id && !e.ancestors.some(a => PLATFORMS.includes(a)),
    )
  }, [])

  // After a jump expands the path, smooth-scroll the revealed node into view.
  // The nonce makes a repeat jump to the same node re-trigger the scroll.
  useEffect(() => {
    if (!scrollTarget) return
    const raf = requestAnimationFrame(() => {
      document.getElementById(`arch-node-${scrollTarget.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [scrollTarget])

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleJump(entry: FlatEntry) {
    setExpanded(prev => new Set([...prev, ...entry.ancestors, entry.node.id]))
    setSelected(entry.node)
    setScrollTarget(t => ({ id: entry.node.id, n: (t?.n ?? 0) + 1 }))
  }

  function handleReset() {
    setExpanded(new Set(["l2", "nginx", "auth"]))
    setSelected(ARCHITECTURE_TREE)
    setScrollTarget(t => ({ id: "l2", n: (t?.n ?? 0) + 1 }))
  }

  function handleAdd(parent: ArchNode) {
    toast.info(`Add to "${parent.label}" — coming in a later step`)
  }

  return (
    <main className="min-h-screen bg-background">
      <style>{`@keyframes archReveal{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}`}</style>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <a href="/" className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground">
          ← back
        </a>

        <div className="mt-4">
          <JumpBar entries={entries} activeId={selected?.id ?? null} onJump={handleJump} onReset={handleReset} />
        </div>

        <h1 className="mt-5 text-xl font-semibold text-foreground">AI Core</h1>
        <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          An interactive view of your AI core — every running entity (agents, bridges,
          memory, MCP, tools). Inspect the current state, change it, and create new
          entities — a skill, an MCP server, a task. New entities join the development
          and usage cycle automatically: from chat or Telegram, ask the agent to pick up
          the change and run the loop. Open a node, or jump straight to it above.
        </p>

        {/* Wide by design: horizontal scroll on narrow screens (like a table). */}
        <div className="mt-4 overflow-x-auto">
          <div className="flex min-w-[720px] overflow-hidden rounded-xl border border-border">
            <div className="w-1/2 border-r border-border bg-muted/10 py-2">
              <TreeNode
                node={ARCHITECTURE_TREE}
                depth={0}
                selectedId={selected?.id ?? null}
                expanded={expanded}
                onSelect={setSelected}
                onToggle={toggle}
                onAdd={handleAdd}
              />
            </div>
            <div className="w-1/2">
              <DetailPanel node={selected} />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
