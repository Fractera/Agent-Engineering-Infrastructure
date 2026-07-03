"use client"

import { useRef, useState } from "react"
import { Loader2, FolderPlus, Upload, Trash2, AlertTriangle } from "lucide-react"

// Right panel when a folder (or the root) is selected: the tools to grow the tree —
// create a sub-folder (name validated for the filesystem) and upload a document
// (.txt/.md/.doc/.docx), plus a guarded delete of a non-root folder. Every action is a
// real filesystem change, applied to THIS folder.
export function FolderTools({
  rel, label, isRoot, onCreateFolder, onUpload, onDelete,
}: {
  rel: string
  label: string
  isRoot: boolean
  onCreateFolder: (name: string) => Promise<string | null>   // returns error or null
  onUpload: (file: File) => Promise<string | null>           // returns error or null
  onDelete: (rel: string) => Promise<void>
}) {
  const [name, setName] = useState("")
  const [folderErr, setFolderErr] = useState("")
  const [creating, setCreating] = useState(false)
  const [uploadErr, setUploadErr] = useState("")
  const [uploading, setUploading] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function create() {
    if (!name.trim()) { setFolderErr("Name is required"); return }
    setCreating(true); setFolderErr("")
    try {
      const err = await onCreateFolder(name.trim())
      if (err) setFolderErr(err); else setName("")
    } finally { setCreating(false) }
  }
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setUploadErr("")
    try {
      const err = await onUpload(file)
      if (err) setUploadErr(err)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }
  async function del() {
    setConfirm(false); setDeleting(true)
    try { await onDelete(rel) } finally { setDeleting(false) }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-foreground/50">{isRoot ? "Knowledge base root" : "Folder"}</span>
      <h2 className="mt-1.5 break-all text-sm font-bold text-foreground">{label}</h2>

      {/* Create sub-folder */}
      <div className="mt-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">New folder here</p>
        <div className="mt-1.5 flex gap-2">
          <input
            type="text"
            placeholder="Folder name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && create()}
            className="h-8 flex-1 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button onClick={create} disabled={creating || !name.trim()} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40">
            {creating ? <Loader2 size={11} className="animate-spin" /> : <FolderPlus size={12} />} Create
          </button>
        </div>
        {folderErr && <p className="mt-1 text-[11px] font-medium text-red-600">{folderErr}</p>}
      </div>

      {/* Upload document */}
      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Add document here</p>
        <p className="mt-1 text-[11px] leading-relaxed text-foreground/60">Allowed: .txt, .md, .doc, .docx — written to disk as a real document.</p>
        <input ref={fileRef} type="file" accept=".txt,.md,.markdown,.doc,.docx" onChange={pick} className="hidden" />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-foreground/40 px-4 text-xs font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-40">
          {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={12} />} Upload document
        </button>
        {uploadErr && <p className="mt-1 text-[11px] font-medium text-red-600">{uploadErr}</p>}
      </div>

      {/* Delete folder (not root) */}
      {!isRoot && (
        <div className="mt-8 rounded-lg border border-red-500/50 bg-red-500/5 p-4">
          <div className="flex items-center gap-1.5 text-red-600">
            <AlertTriangle size={13} />
            <span className="text-xs font-bold uppercase tracking-wider">Danger zone</span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-foreground/80">Delete this folder and everything inside it. This is a real, permanent removal from disk.</p>
          <button onClick={() => setConfirm(true)} disabled={deleting} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-red-500/60 px-4 text-xs font-semibold text-red-600 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-40">
            {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Delete folder
          </button>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirm(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-1.5 text-red-600">
              <AlertTriangle size={15} />
              <h3 className="text-sm font-bold">Delete folder?</h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-foreground/80">
              This permanently removes &ldquo;{label}&rdquo; and <span className="font-semibold text-foreground">everything inside it</span> from disk. This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirm(false)} className="inline-flex h-8 items-center rounded-md border border-border px-4 text-xs font-semibold text-foreground transition-colors hover:bg-muted">Cancel</button>
              <button onClick={del} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-red-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-red-500"><Trash2 size={11} /> Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
