"use client"

import { ChevronRight, Folder, FolderOpen, FileText, FileType2 } from "lucide-react"
import type { DocNode } from "@/lib/crud-docs/format"

// Left tree for /documents — real folders and files of any depth under CRUD-DOCS/,
// using the same chevron-folder look as the architecture tree. Selecting a folder
// targets it (where a new folder / upload lands); selecting a file opens its preview.
// No amber/declared styling — every node is a real entry on disk.

type Props = {
  nodes: DocNode[]
  selected: string | null   // rel path of the selected node ("" = root)
  expanded: Set<string>
  onSelect: (node: DocNode) => void
  onToggle: (rel: string) => void
  depth?: number
}

function fileIcon(ext?: string) {
  return ext === ".doc" || ext === ".docx" ? FileType2 : FileText
}

export function DocsTree({ nodes, selected, expanded, onSelect, onToggle, depth = 0 }: Props) {
  if (nodes.length === 0 && depth === 0) {
    return <p className="px-4 py-3 text-xs text-foreground/50">No documents yet — select the root on the right and create a folder or upload a document.</p>
  }
  return (
    <div>
      {nodes.map(node => {
        const isSel = selected === node.rel
        if (node.kind === "folder") {
          const open = expanded.has(node.rel)
          return (
            <div key={node.rel}>
              <button
                onClick={() => { onSelect(node); onToggle(node.rel) }}
                style={{ paddingLeft: depth * 16 + 8 }}
                className={`flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-xs text-foreground transition-colors ${isSel ? "bg-primary/15" : "hover:bg-muted/60"}`}
              >
                <ChevronRight size={12} className={`shrink-0 text-foreground/60 transition-transform ${open ? "rotate-90" : ""}`} />
                {open ? <FolderOpen size={14} className="shrink-0 text-amber-500" /> : <Folder size={14} className="shrink-0 text-amber-500" />}
                <span className="ml-0.5 truncate font-semibold">{node.name}</span>
                <span className="ml-auto shrink-0 font-mono text-[10px] text-foreground/50">{node.children?.length ?? 0}</span>
              </button>
              {open && node.children && (
                <DocsTree nodes={node.children} selected={selected} expanded={expanded} onSelect={onSelect} onToggle={onToggle} depth={depth + 1} />
              )}
            </div>
          )
        }
        const Icon = fileIcon(node.ext)
        return (
          <button
            key={node.rel}
            onClick={() => onSelect(node)}
            style={{ paddingLeft: depth * 16 + 8 + 18 }}
            className={`flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-xs transition-colors ${isSel ? "bg-primary/15 text-foreground" : "text-foreground hover:bg-muted/60"}`}
          >
            <Icon size={13} className="shrink-0 text-foreground/60" />
            <span className="ml-0.5 truncate">{node.name}</span>
          </button>
        )
      })}
    </div>
  )
}
