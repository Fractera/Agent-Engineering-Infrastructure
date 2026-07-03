"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { CodeEditor } from "./code-editor.client"

// Collapsible "Source (example)" accordion for the add forms. A blank code
// editor where the user can paste an example; the text is submitted with the
// declaration and seeded as a code-change request the agent builds from.
export function SourceExample({ value, onChange }: {
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-muted/60"
      >
        <span>Source (example)</span>
        <ChevronRight size={12} className={`text-foreground/70 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border p-2">
          <p className="mb-2 text-[11px] text-foreground/70">
            Optional — paste example code for the agent to build from.
          </p>
          <div className="overflow-hidden rounded-md border border-border">
            <CodeEditor value={value} language="typescript" onChange={onChange} />
          </div>
        </div>
      )}
    </div>
  )
}
