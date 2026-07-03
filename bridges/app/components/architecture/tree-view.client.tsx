"use client"

import {
  ChevronRight, Plus, Pencil, Folder, FolderOpen, File, FileText, FileCode,
  Rocket, Trash2,
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
    return <F size={14} className="shrink-0 text-amber-500" />
  }
  const Leaf = LEAF_ICON[node.kind] ?? File
  return <Leaf size={13} className="shrink-0 text-foreground/60" />
}

type Props = {
  node: ArchNode
  depth: number
  selectedId: string | null
  expanded: Set<string>
  /** Node ids OR hrefs that changed in the last poll — they flash once. */
  blink?: Set<string>
  onSelect: (node: ArchNode) => void
  onToggle: (id: string) => void
  onAdd: (parent: ArchNode) => void
  /** Optional — only /ai-core wires it (the instruction-doc edit pencil). Other callers
   *  (e.g. /architecture) omit it; nodes without editTo never show the pencil anyway. */
  onEdit?: (node: ArchNode) => void
  /** Optional — only /architecture wires these (flow-B materializer, step 126). On a
   *  pending (req) node, hover reveals Launch (bundle ALL pending records into one
   *  development step) and Delete (this record, via a confirm modal in the parent).
   *  Both must be present for the actions to render. */
  onLaunch?: () => void
  onDeletePending?: (node: ArchNode) => void
}

export function TreeNode({
  node, depth, selectedId, expanded, blink, onSelect, onToggle, onAdd, onEdit,
  onLaunch, onDeletePending,
}: Props) {
  const hasChildren = !!node.children?.length || !!node.addable
  const isOpen = expanded.has(node.id)
  const isSelected = selectedId === node.id
  const isBlinking = !!blink && (blink.has(node.id) || (!!node.href && blink.has(node.href)))

  function handleClick() {
    onSelect(node)
    if (hasChildren) onToggle(node.id)
  }

  return (
    <div>
      <style>{`@keyframes archBlink{0%,100%{background-color:transparent}50%{background-color:rgb(245 158 11 / 0.35)}}`}</style>
      {/* Row = the select button plus, for an instruction doc, a sibling edit pencil
          (not nested — nested buttons are invalid). The pencil shows on hover/selection. */}
      <div className={`group/row flex items-center rounded-md ${isSelected ? "bg-primary/15" : "hover:bg-muted/60"}`}>
        <button
          id={`arch-node-${node.id}`}
          onClick={handleClick}
          style={{ paddingLeft: depth * 16 + 8, animation: isBlinking ? "archBlink 1s ease-in-out 3" : undefined }}
          className="group flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pr-2 text-left text-xs text-foreground"
        >
          <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-foreground/60">
            {hasChildren && (
              <ChevronRight size={12} className={`transition-transform ${isOpen ? "rotate-90" : ""}`} />
            )}
          </span>
          <NodeIcon node={node} isOpen={isOpen} />
          <span className={`ml-0.5 truncate font-semibold ${node.declared ? "text-amber-600" : "text-foreground"}`}>{node.label}</span>
          {node.pending && (
            <span className="ml-1 shrink-0 rounded-full border border-amber-500/50 px-1.5 font-mono text-[9px] font-semibold text-amber-600">req</span>
          )}
          {node.badge && (
            <span className="ml-1 shrink-0 rounded-full border border-sky-500/50 px-1.5 font-mono text-[9px] font-semibold text-sky-600">{node.badge}</span>
          )}
          {node.port && (
            <span className="ml-auto shrink-0 font-mono text-[10px] text-foreground/60">
              {node.port}
            </span>
          )}
        </button>
        {node.editTo && onEdit && (
          <button
            onClick={() => onEdit(node)}
            title="Edit in Draft Settings"
            className="mr-2 inline-flex h-5 shrink-0 items-center gap-1 rounded border border-dashed border-foreground/40 px-1.5 text-[10px] font-semibold text-foreground/70 opacity-0 transition-opacity hover:bg-foreground hover:text-background group-hover/row:opacity-100"
          >
            <Pencil size={9} /> edit
          </button>
        )}
        {/* Hover actions on a pending (req) node — flow-B materializer (step 126).
            Launch is global (bundle all pending records); Delete is this record and
            sits rightmost. Siblings of the select button (no nested buttons). */}
        {node.pending && onLaunch && onDeletePending && (
          <div className="mr-1 hidden shrink-0 items-center gap-0.5 group-hover/row:flex">
            <button
              onClick={onLaunch}
              title="Launch — bundle all pending records into one development step"
              className="rounded p-1 text-foreground/60 transition-colors hover:bg-violet-500/15 hover:text-violet-600"
            >
              <Rocket size={12} />
            </button>
            <button
              onClick={() => onDeletePending(node)}
              title="Delete this record (permanent; the real route file is untouched)"
              className="rounded p-1 text-foreground/60 transition-colors hover:bg-red-500/15 hover:text-red-600"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {isOpen && (
        <div style={{ animation: "archReveal .18s ease-out" }}>
          {node.children?.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expanded={expanded}
              blink={blink}
              onSelect={onSelect}
              onToggle={onToggle}
              onAdd={onAdd}
              onEdit={onEdit}
              onLaunch={onLaunch}
              onDeletePending={onDeletePending}
            />
          ))}
          {node.addable && (
            <button
              onClick={() => onAdd(node)}
              style={{ paddingLeft: (depth + 1) * 16 + 8 }}
              className="flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-xs text-foreground/70 transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              <span className="h-3.5 w-3.5 shrink-0" />
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-dashed border-foreground/40">
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
