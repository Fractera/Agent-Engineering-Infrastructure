"use client"

import { ArrowUpRight } from "lucide-react"
import type { ArchNode } from "@/lib/architecture/types"

const KIND_LABEL: Record<string, string> = {
  layer: "Layer",
  service: "Service",
  platform: "AI platform",
  group: "Group",
  skill: "Skill",
  mcp: "MCP server",
  config: "Config",
  page: "Page",
  api: "API endpoint",
  note: "Note",
}

// Right ~50% panel. Shows the selected node's text plus optional metadata
// (roles / rendering / method) and an Open link — the accompanying "file" for
// each node that lets a human (or an agent reading this) grasp it at a glance.
export function DetailPanel({ node }: { node: ArchNode | null }) {
  if (!node) {
    return (
      <div className="flex h-full items-center justify-center p-10 text-center">
        <p className="max-w-xs text-xs text-foreground/70">
          Select a node on the left to see what it is and how it connects.
        </p>
      </div>
    )
  }

  const meta = node.meta

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-foreground/30 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground">
          {KIND_LABEL[node.kind] ?? node.kind}
        </span>
        {node.port && (
          <span className="font-mono text-[10px] text-foreground/60">{node.port}</span>
        )}
      </div>

      <h2 className="text-lg font-bold text-foreground">{node.label}</h2>

      {node.description && (
        <p className="text-sm leading-relaxed text-foreground/80">{node.description}</p>
      )}

      {meta && (
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border">
          {meta.roles && <MetaRow k="Roles" v={meta.roles} />}
          {meta.rendering && <MetaRow k="Rendering" v={meta.rendering} />}
          {meta.method && <MetaRow k="Method" v={meta.method} />}
        </div>
      )}

      {node.href && (
        <a
          href={node.href}
          className="inline-flex w-fit items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          Open page <ArrowUpRight size={12} />
        </a>
      )}

    </div>
  )
}

function MetaRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-background px-3 py-2 text-xs">
      <span className="text-foreground/70">{k}</span>
      <span className="font-mono font-medium text-foreground">{v}</span>
    </div>
  )
}
