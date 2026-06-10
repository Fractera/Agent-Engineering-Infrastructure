"use client"

import {
  ChevronRight, Plus, Folder, FolderOpen, File, FileText, FileCode,
} from "lucide-react"
import type { ArchNode, ArchKind } from "@/lib/architecture/types"

// File-explorer iconography: a container (any node with children) is a folder
// that opens/closes; a leaf is the document it holds. Leaf glyph varies by kind
// so config/skills read as text files and mcp/api read as code.
const LEAF_ICON: Partial<Record<ArchKind, typeof File>> = {
  config: FileText,
  skill:  FileText,
  page:   FileText,
  note:   FileText,
  mcp:    FileCode,
  api:    FileCode,
}

function NodeIcon({ node, isOpen }: { node: ArchNode; isOpen: boolean }) {
  const hasChildren = !!node.children?.length || !!node.addable
  if (hasChildren) {
    const F = isOpen ? FolderOpen : Folder
    return <F size={14} className="shrink-0 text-amber-400/90" />
  }
  const Leaf = LEAF_ICON[node.kind] ?? File
  return <Leaf size={13} className="shrink-0 text-muted-foreground/70" />
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
        id={`arch-node-${node.id}`}
        onClick={handleClick}
        style={{ paddingLeft: depth * 16 + 8 }}
        className={`group flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-xs transition-colors ${
          isSelected ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/50"
        }`}
      >
        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-muted-foreground/60">
          {hasChildren && (
            <ChevronRight size={12} className={`transition-transform ${isOpen ? "rotate-90" : ""}`} />
          )}
        </span>
        <NodeIcon node={node} isOpen={isOpen} />
        <span className={`ml-0.5 truncate font-medium ${node.pending ? "text-amber-400/90" : "text-foreground/90"}`}>{node.label}</span>
        {node.pending && (
          <span className="ml-1 shrink-0 rounded-full border border-amber-500/30 px-1.5 font-mono text-[9px] text-amber-400/80">req</span>
        )}
        {node.port && (
          <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground/70">
            {node.port}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{ animation: "archReveal .18s ease-out" }}>
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
              className="flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-xs text-muted-foreground/70 transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              <span className="h-3.5 w-3.5 shrink-0" />
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-dashed border-muted-foreground/50">
                <Plus size={9} />
              </span>
              <span className="ml-0.5">{node.addLabel ?? "Add"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
