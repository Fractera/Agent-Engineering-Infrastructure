"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { CodeEditor } from "@/components/architecture/code-editor.client"

// "Source" view of a development step — the raw markdown file on disk, mirroring
// the architecture Source tab. NEW steps are editable (save writes the file
// directly); COMPLETED steps are read-only.
export function StepSource({
  id, editable, onSaved,
}: {
  id: string
  editable: boolean
  onSaved?: () => void
}) {
  const [raw, setRaw] = useState("")
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/development-steps/${id}/source`)
      .then(r => (r.ok ? r.json() : { raw: "" }))
      .then(d => { setRaw(d.raw ?? ""); setDraft(d.raw ?? "") })
      .catch(() => { setRaw(""); setDraft("") })
      .finally(() => setLoading(false))
  }, [id])

  const dirty = draft !== raw

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/development-steps/${id}/source`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: draft }),
      })
      if (res.ok) { setRaw(draft); onSaved?.() }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-4 text-xs text-foreground/60"><Loader2 size={12} className="mr-1 inline animate-spin" />Loading source…</div>
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-foreground/70">
        The real markdown file for this step.{" "}
        {editable ? "Edit it directly — saving writes the file an agent reads." : "Read-only — this step is completed."}
      </p>
      <div className="overflow-hidden rounded-md border border-border">
        <CodeEditor
          value={editable ? draft : raw}
          language="markdown"
          readOnly={!editable}
          onChange={editable ? setDraft : undefined}
        />
      </div>
      {editable && dirty && (
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex h-8 items-center justify-center gap-1.5 self-start rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving && <Loader2 size={11} className="animate-spin" />}
          Save file
        </button>
      )}
    </div>
  )
}
