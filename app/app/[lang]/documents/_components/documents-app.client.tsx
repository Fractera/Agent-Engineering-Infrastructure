"use client"

import { useEffect, useState } from "react"
import type { DocNode } from "@/lib/crud-docs/format"
import { DocsTree } from "@/components/crud-docs/docs-tree.client"
import { DocPreview } from "@/components/crud-docs/doc-preview.client"
import { FolderTools } from "@/components/crud-docs/folder-tools.client"

// Documents — the knowledge base file manager. A two-column layout like /architecture:
// left is the REAL folder/file tree under CRUD-DOCS/; right is the tools for the
// selected node (a folder → create sub-folder / upload / delete; a file → preview /
// activate / delete). Unlike the other filesystem pages there is no staging: every
// action changes the disk for real. These documents stay on the server and are NOT
// synced to GitHub; activating one adds it to Company Memory (LightRAG).

const DESCRIPTION =
  "View and add the documents that form the base of your knowledge base — notes about your " +
  "company, technical processes, anything an agent should know. When you activate a document " +
  "it becomes part of your vector store, served by LightRAG (Company Memory), so every agent " +
  "can recall it. These documents are NOT synced to GitHub — they stay on your own disk."

type Sel = { kind: "root" } | { kind: "node"; node: DocNode }

function findNode(nodes: DocNode[], rel: string): DocNode | null {
  for (const n of nodes) {
    if (n.rel === rel) return n
    if (n.children) { const f = findNode(n.children, rel); if (f) return f }
  }
  return null
}

export function DocumentsApp() {
  const [tree, setTree] = useState<DocNode[]>([])
  const [sel, setSel] = useState<Sel>({ kind: "root" })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  async function refresh(keepRel?: string) {
    const res = await fetch("/api/documents/tree")
    if (!res.ok) return
    const { tree: t } = await res.json()
    const list: DocNode[] = t ?? []
    setTree(list)
    // Re-resolve the current selection against the fresh tree (it may be gone).
    if (keepRel !== undefined) {
      const n = keepRel ? findNode(list, keepRel) : null
      setSel(n ? { kind: "node", node: n } : { kind: "root" })
    } else if (sel.kind === "node") {
      const n = findNode(list, sel.node.rel)
      setSel(n ? { kind: "node", node: n } : { kind: "root" })
    }
  }
  useEffect(() => { refresh() }, [])

  function toggle(rel: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(rel) ? next.delete(rel) : next.add(rel)
      return next
    })
  }
  function select(node: DocNode) { setSel({ kind: "node", node }) }

  // The folder a create / upload targets: the selected folder, the selected file's
  // parent, or the root.
  const targetFolderRel =
    sel.kind === "root" ? "" :
    sel.node.kind === "folder" ? sel.node.rel :
    sel.node.rel.split("/").slice(0, -1).join("/")

  async function createFolder(name: string): Promise<string | null> {
    const res = await fetch("/api/documents/folder", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parent: targetFolderRel, name }),
    })
    const d = await res.json()
    if (!res.ok) return d.error ?? "Could not create folder"
    if (targetFolderRel) setExpanded(prev => new Set([...prev, targetFolderRel]))
    await refresh(d.rel)
    return null
  }
  async function upload(file: File): Promise<string | null> {
    const fd = new FormData()
    fd.set("parent", targetFolderRel)
    fd.set("file", file)
    const res = await fetch("/api/documents/upload", { method: "POST", body: fd })
    const d = await res.json()
    if (!res.ok) return d.error ?? "Could not upload"
    if (targetFolderRel) setExpanded(prev => new Set([...prev, targetFolderRel]))
    await refresh(d.rel)
    return null
  }
  async function remove(rel: string) {
    await fetch(`/api/documents/entry?path=${encodeURIComponent(rel)}`, { method: "DELETE" })
    await refresh("")
  }

  const selectedRel = sel.kind === "node" ? sel.node.rel : ""
  const folderLabel = sel.kind === "root" ? "CRUD-DOCS" : (sel.node.name)

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <a href="/" className="font-mono text-xs text-foreground/70 transition-colors hover:text-foreground">← back</a>
        <h1 className="mt-1 text-xl font-bold text-foreground">Documents</h1>
        <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-foreground/80">{DESCRIPTION}</p>

        <div className="mt-4 overflow-x-auto">
          <div className="flex h-[72vh] min-w-[720px] overflow-hidden rounded-xl border border-border">
            <div className="flex w-1/2 flex-col border-r border-border bg-muted/10">
              <button
                onClick={() => setSel({ kind: "root" })}
                className={`flex items-center gap-1.5 border-b border-border px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider transition-colors ${sel.kind === "root" ? "bg-primary/10 text-foreground" : "text-foreground/70 hover:bg-muted/60"}`}
              >
                CRUD-DOCS (root)
              </button>
              <div className="flex-1 overflow-y-auto py-2">
                <DocsTree nodes={tree} selected={selectedRel} expanded={expanded} onSelect={select} onToggle={toggle} />
              </div>
            </div>
            <div className="w-1/2 overflow-y-auto">
              {sel.kind === "node" && sel.node.kind === "file" ? (
                <DocPreview node={sel.node} onDelete={remove} />
              ) : (
                <FolderTools
                  rel={targetFolderRel}
                  label={folderLabel}
                  isRoot={sel.kind === "root"}
                  onCreateFolder={createFolder}
                  onUpload={upload}
                  onDelete={remove}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
