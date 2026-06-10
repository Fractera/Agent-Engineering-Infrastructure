"use client"

import { X, FolderTree } from "lucide-react"
import { DEFAULT_PROJECT, type Project } from "@/lib/architecture/projects"

// Modal that asks which project a new endpoint belongs to: the default project
// (→ /api) or one of the named projects (→ /api/project/<slug>). Returns the
// API base path for that choice.
export function ProjectPicker({
  projects,
  onPick,
  onClose,
}: {
  projects: Project[]
  onPick: (base: string) => void
  onClose: () => void
}) {
  const named = projects.filter(p => (p.slug ?? p.name) !== DEFAULT_PROJECT && p.name !== DEFAULT_PROJECT)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Endpoint — choose a project</h2>
          <button onClick={onClose} className="text-foreground/60 transition-colors hover:text-foreground">
            <X size={14} />
          </button>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">
          Which project does this endpoint belong to? The path is created accordingly.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => onPick("/api")}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:bg-muted"
          >
            <span className="text-sm font-semibold text-foreground">Default project</span>
            <span className="font-mono text-[11px] text-foreground/60">/api/…</span>
          </button>
          {named.map(p => (
            <button
              key={p.id}
              onClick={() => onPick(`/api/project/${p.slug ?? p.id}`)}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:bg-muted"
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <FolderTree size={12} className="text-amber-500" />{p.name}
              </span>
              <span className="font-mono text-[11px] text-foreground/60">/api/project/{p.slug ?? p.id}/…</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
