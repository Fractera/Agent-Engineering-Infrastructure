"use client"

import { ChevronRight, Plus } from "lucide-react"
import type { ArchNode, ArchKind } from "@/lib/architecture/types"

// Dot colour per node kind — mirrors the carousel indicator language so the
// human reads the same colour vocabulary everywhere in the product.
const KIND_DOT: Record<ArchKind, string> = {
  layer:    "bg-foreground/70",
  service:  "bg-primary",
  platform: "bg-orange-400",
  group:    "bg-muted-foreground/60",
  skill:    "bg-violet-400",
  mcp:      "bg-cyan-400",
  config:   "bg-amber-400",
  page:     "bg-emerald-400",
  api:      "bg-sky-400",
  note:     "bg-muted-foreground/40",
}

type Props = {
  node: ArchNode
  depth: number
  selectedId: string | null
  expanded: Set<string>
  onSelect: (node: ArchNode) => void
  onToggle: (id: string) => void
  onAdd: (parent: ArchNode) => void
}

export function TreeNode({
  node, depth, selectedId, expanded, onSelect, onToggle, onAdd,
}: Props) {
  const hasChildren = !!node.children?.length || !!node.addable
  const isOpen = expanded.has(node.id)
  const isSelected = selectedId === node.id

  function handleClick() {
    onSelect(node)
    if (hasChildren) onToggle(node.id)
  }

  return (
    <div>
      <button
        onClick={handleClick}
        style={{ paddingLeft: depth * 16 + 8 }}
        className={`group flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-xs transition-colors ${
          isSelected ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/50"
        }`}
      >
        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
          {hasChildren ? (
            <ChevronRight
              size={12}
              className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
            />
          ) : null}
        </span>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${KIND_DOT[node.kind]}`} />
        <span className="truncate font-medium text-foreground/90">{node.label}</span>
        {node.port && (
          <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground/70">
            {node.port}
          </span>
        )}
      </button>

      {isOpen && (
        <div>
          {node.children?.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expanded={expanded}
              onSelect={onSelect}
              onToggle={onToggle}
              onAdd={onAdd}
            />
          ))}
          {node.addable && (
            <button
              onClick={() => onAdd(node)}
              style={{ paddingLeft: (depth + 1) * 16 + 8 }}
              className="flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-xs text-muted-foreground/70 transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              <span className="h-3.5 w-3.5 shrink-0" />
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-dashed border-muted-foreground/50">
                <Plus size={9} />
              </span>
              <span>{node.addLabel ?? "Add"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
