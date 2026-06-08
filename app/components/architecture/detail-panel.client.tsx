"use client"

import type { ArchNode } from "@/lib/architecture/types"

const KIND_LABEL: Record<string, string> = {
  layer: "Layer",
  service: "Service",
  platform: "AI platform",
  group: "Group",
  skill: "Skill",
  mcp: "MCP server",
  config: "Config",
  note: "Note",
}

// Right ~50% panel. v1 is intentionally a placeholder surface — it shows the
// selected node's text and is the canvas we flesh out (skill source, live
// status, edit affordances) in later sub-steps.
export function DetailPanel({ node }: { node: ArchNode | null }) {
  if (!node) {
    return (
      <div className="flex h-full items-center justify-center p-10 text-center">
        <p className="max-w-xs text-xs text-muted-foreground">
          Select a node on the left to see what it is and how it connects.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {KIND_LABEL[node.kind] ?? node.kind}
        </span>
        {node.port && (
          <span className="font-mono text-[10px] text-muted-foreground/70">{node.port}</span>
        )}
      </div>

      <h2 className="text-lg font-semibold text-foreground">{node.label}</h2>

      {node.description && (
        <p className="text-sm leading-relaxed text-muted-foreground">{node.description}</p>
      )}

      <div className="mt-auto rounded-lg border border-dashed border-border p-4">
        <p className="text-[11px] text-muted-foreground/60">
          This panel is a placeholder canvas. Future steps render the live detail
          here — skill source, status, and editing.
        </p>
      </div>
    </div>
  )
}
