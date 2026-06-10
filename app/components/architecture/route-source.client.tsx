"use client"

import { useEffect, useState } from "react"
import { Loader2, FileCode } from "lucide-react"
import { projectApi } from "@/lib/architecture/project-api"
import { CodeEditor } from "./code-editor.client"

type SourceFile = { rel: string; content: string; language: string }

// "Source" accordion body for a route: a VS-Code-style view of its real code
// (page + _components). Edits are local screen translation — saving emits a
// route_tasks request (one per changed file), never a file write (§3.13).
export function RouteSource({ path, onChanged }: { path: string; onChanged?: () => void }) {
  const [files, setFiles] = useState<SourceFile[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(projectApi(`/source?path=${encodeURIComponent(path)}`))
      .then(r => (r.ok ? r.json() : { files: [] }))
      .then(d => { setFiles(d.files ?? []); setDrafts({}); setActive(0) })
      .catch(() => setFiles([]))
      .finally(() => setLoading(false))
  }, [path])

  if (loading) {
    return <div className="p-4 text-xs text-foreground/60"><Loader2 size={12} className="mr-1 inline animate-spin" />Loading source…</div>
  }
  if (files.length === 0) {
    return <div className="p-4 text-xs text-foreground/60">No source files found for this route.</div>
  }

  const file = files[active]
  const current = drafts[file.rel] ?? file.content
  const dirty = current !== file.content

  async function save() {
    setSaving(file.rel)
    try {
      const res = await fetch(projectApi("/architecture/tasks"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path,
          kind: "todo",
          body: `Code update for ${file.rel}:\n\n${current}`,
          outcome: `Apply the proposed code to ${file.rel}`,
        }),
      })
      if (res.ok) {
        // Lock in the proposed text as the new baseline for this session and
        // notify the tree so the (req) badge turns on.
        setFiles(prev => prev.map(f => (f.rel === file.rel ? { ...f, content: current } : f)))
        onChanged?.()
      }
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-foreground/70">
        The real code of this route — read it, paste in code from any model, or edit by hand.
        Nothing runs and no file changes; saving adds an update request to the to-do list.
      </p>
      <div className="flex flex-wrap gap-1">
        {files.map((f, i) => (
          <button
            key={f.rel}
            onClick={() => setActive(i)}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] transition-colors ${
              i === active ? "border-foreground/40 bg-foreground text-background" : "border-border text-foreground/80 hover:bg-muted"
            }`}
          >
            <FileCode size={10} />
            {f.rel.split("/").slice(-2).join("/")}
            {(drafts[f.rel] ?? f.content) !== f.content && <span className="text-amber-500">●</span>}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <CodeEditor
          value={current}
          language={file.language}
          onChange={v => setDrafts(prev => ({ ...prev, [file.rel]: v }))}
        />
      </div>

      {dirty && (
        <button
          onClick={save}
          disabled={saving === file.rel}
          className="inline-flex h-8 items-center justify-center gap-1.5 self-start rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving === file.rel && <Loader2 size={11} className="animate-spin" />}
          Add update to to-do
        </button>
      )}
    </div>
  )
}
