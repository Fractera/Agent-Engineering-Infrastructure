"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Download, Trash2, Sparkles, AlertTriangle } from "lucide-react"
import type { DocNode } from "@/lib/crud-docs/format"

type Preview = { kind: "text"; content: string } | { kind: "binary"; note: string } | { kind: "missing" }

// Right panel for a selected document: a Preview of the whole file (text for .txt/.md,
// extracted text for .docx, download-only for legacy .doc), plus Activate (ingest into
// Company Memory) and a guarded real Delete.
export function DocPreview({ node, onDelete }: { node: DocNode; onDelete: (rel: string) => Promise<void> }) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/documents/preview?path=${encodeURIComponent(node.rel)}`)
      .then(r => (r.ok ? r.json() : { kind: "missing" }))
      .then(setPreview)
      .catch(() => setPreview({ kind: "missing" }))
      .finally(() => setLoading(false))
  }, [node.rel])

  // Honest toasts: the document is SENT for indexing, not yet indexed. Green when
  // LightRAG has an OpenAI key (it will actually index — track it in the LightRAG
  // panel); orange when there is no key (accepted but indexing will not finish);
  // red on a hard failure.
  async function activate() {
    setActivating(true)
    try {
      const res = await fetch("/api/documents/ingest", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: node.rel }),
      })
      const d = await res.json()
      if (!d.ok) {
        toast.error(d.message ?? "Could not activate.")
      } else if (d.embeddingConfigured === false) {
        toast.warning(
          "Sent to Company Memory for indexing — but LightRAG has no OpenAI key yet, so indexing will not finish. " +
          "Add an OpenAI Memory key in Admin, then activate again.",
        )
      } else if (d.embeddingConfigured === true) {
        toast.success(
          "OpenAI API key is connected to LightRAG — the document was sent for indexing. " +
          "Track completion in the LightRAG panel.",
        )
      } else {
        toast.success("Sent to Company Memory for indexing. Track completion in the LightRAG panel.")
      }
    } catch {
      toast.error("Could not reach the server.")
    } finally {
      setActivating(false)
    }
  }

  async function del() {
    setConfirm(false); setDeleting(true)
    try { await onDelete(node.rel) } finally { setDeleting(false) }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-foreground/50">Document{node.ext ? ` · ${node.ext.slice(1)}` : ""}</span>
        </div>
        <h2 className="mt-1.5 break-all text-sm font-bold text-foreground">{node.name}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={activate}
            disabled={activating}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {activating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            Activate (add to Company Memory)
          </button>
          <a
            href={`/api/documents/file?path=${encodeURIComponent(node.rel)}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-4 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Download size={11} /> Download
          </a>
          <button
            onClick={() => setConfirm(true)}
            disabled={deleting}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-500/60 px-4 text-xs font-semibold text-red-600 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-40"
          >
            {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Delete
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-foreground/70">Preview</p>
        {loading ? (
          <div className="text-xs text-foreground/60"><Loader2 size={12} className="mr-1 inline animate-spin" />Loading…</div>
        ) : preview?.kind === "text" ? (
          <pre className="whitespace-pre-wrap break-words rounded-md border border-border bg-muted/20 p-3 font-mono text-[11px] leading-relaxed text-foreground">{preview.content || "(empty document)"}</pre>
        ) : preview?.kind === "binary" ? (
          <p className="rounded-md border border-border bg-muted/20 p-3 text-[11px] leading-relaxed text-foreground/70">{preview.note}</p>
        ) : (
          <p className="text-[11px] text-foreground/50">Could not read this document.</p>
        )}
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirm(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-1.5 text-red-600">
              <AlertTriangle size={15} />
              <h3 className="text-sm font-bold">Delete document?</h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-foreground/80">
              This permanently removes &ldquo;{node.name}&rdquo; from disk
              <span className="font-semibold text-foreground"> immediately</span>. This cannot be undone.
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
