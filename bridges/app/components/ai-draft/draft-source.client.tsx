"use client"

import { useEffect, useState } from "react"
import { Loader2, RotateCcw } from "lucide-react"
import type { Draft } from "@/lib/ai-draft/draft-format"
import { CodeEditor } from "@/components/architecture/code-editor.client"

type Original = { content: string; readable: boolean; language: string; note?: string }

// "Source" accordion body for a draft, mirroring the architecture RouteSource: a
// VS-Code-style view of the REAL original file the draft refers to. Editing is local
// screen translation; saving stores the proposed content ON the draft (not the real
// file) so an agent reads it and applies it (mode = supplement / replace). The original
// is the read-only baseline; once you save, your version is what shows and the draft
// turns (req).
export function DraftSource({ draft, onSave }: { draft: Draft; onSave: (source: string) => Promise<void> }) {
  const [original, setOriginal] = useState<Original | null>(null)
  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/ai-draft-settings/${draft.id}/original`)
      .then(r => (r.ok ? r.json() : null))
      .then((o: Original | null) => {
        setOriginal(o)
        setValue(draft.source ? draft.source : (o?.content ?? ""))
      })
      .catch(() => setOriginal(null))
      .finally(() => setLoading(false))
  }, [draft.id, draft.source])

  if (loading) {
    return <div className="p-2 text-xs text-foreground/60"><Loader2 size={12} className="mr-1 inline animate-spin" />Loading source…</div>
  }

  const language = original?.language ?? "markdown"
  // The baseline a change is measured against: your saved version if you have one,
  // otherwise the real original.
  const baseline = draft.source ? draft.source : (original?.content ?? "")
  const dirty = value !== baseline

  async function save() {
    setSaving(true)
    try { await onSave(value) } finally { setSaving(false) }
  }
  async function discard() {
    setSaving(true)
    try { await onSave(""); setValue(original?.content ?? "") } finally { setSaving(false) }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] leading-relaxed text-foreground/70">
        {draft.source
          ? "Your saved version — this is what the agent reads and applies to the real file. The original below was the starting point."
          : original?.readable
            ? "The current content of the real file — read it, paste in code from any model, or edit by hand. Saving stores your version on the draft; nothing touches the real file until an agent applies it."
            : (original?.note ?? "Author the proposed file content here.")}
      </p>

      <div className="overflow-hidden rounded-md border border-border">
        <CodeEditor value={value} language={language} onChange={setValue} />
      </div>

      <div className="flex items-center gap-2">
        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {saving && <Loader2 size={11} className="animate-spin" />}
            Save source
          </button>
        )}
        {draft.source && (
          <button
            onClick={discard}
            disabled={saving}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-4 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <RotateCcw size={11} />
            Discard source change
          </button>
        )}
      </div>
    </div>
  )
}
