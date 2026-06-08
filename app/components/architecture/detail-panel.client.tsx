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
        <p className="max-w-xs text-xs text-muted-foreground">
          Select a node on the left to see what it is and how it connects.
        </p>
      </div>
    )
  }

  const meta = node.meta

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

      <div className="mt-auto rounded-lg border border-dashed border-border p-4">
        <p className="text-[11px] text-muted-foreground/60">
          This panel is the accompanying file for the selected node. Read top to
          bottom and you know what it is, how it connects, and why it earns its place.
        </p>
      </div>
    </div>
  )
}

function MetaRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-background px-3 py-2 text-xs">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono text-foreground">{v}</span>
    </div>
  )
}
