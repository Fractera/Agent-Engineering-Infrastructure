"use client"

import { X, FolderTree } from "lucide-react"

export type PickerProject = { label: string; slug: string; description?: string | null }

// Modal that asks which project a new endpoint belongs to: the default project
// (→ /api) or one of the projects that exist in the tree — both seed (built) and
// DB-declared. Returns the API base path for that choice. Capped at 600px tall;
// the card list scrolls when it overflows.
export function ProjectPicker({
  projects,
  onPick,
  onClose,
}: {
  projects: PickerProject[]
  onPick: (base: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[600px] w-full max-w-md flex-col rounded-xl border border-border bg-background shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-base font-bold text-foreground">Endpoint — choose a project</h2>
          <button onClick={onClose} className="text-foreground/60 transition-colors hover:text-foreground">
            <X size={14} />
          </button>
        </div>
        <p className="px-5 pt-3 text-xs leading-relaxed text-foreground/80">
          Which project does this endpoint belong to? The path is created accordingly.
        </p>

        <div className="flex flex-col gap-2 overflow-y-auto p-5">
          <button
            onClick={() => onPick("/api")}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:bg-muted"
          >
            <span className="text-sm font-semibold text-foreground">Default project</span>
            <span className="font-mono text-[11px] text-foreground/60">/api/…</span>
          </button>
          {projects.map(p => (
            <button
              key={p.slug}
              onClick={() => onPick(`/api/project/${p.slug}`)}
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:bg-muted"
            >
              <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground">
                <FolderTree size={12} className="shrink-0 text-amber-500" />
                <span className="truncate">{p.label}</span>
              </span>
              <span className="shrink-0 font-mono text-[11px] text-foreground/60">/api/project/{p.slug}/…</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
