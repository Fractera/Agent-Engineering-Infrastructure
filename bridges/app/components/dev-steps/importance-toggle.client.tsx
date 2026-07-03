"use client"

import type { Importance } from "@/lib/dev-steps/step-file"

// Importance is colour-coded everywhere: optional = gray, mandatory = amber,
// critical = red. These helpers keep that mapping in one place (dot, label, and
// the segmented toggle below all use it).
export const IMPORTANCE_ORDER: Importance[] = ["optional", "mandatory", "critical"]

export const importanceDot: Record<Importance, string> = {
  optional: "bg-foreground/30",
  mandatory: "bg-amber-500",
  critical: "bg-red-500",
}
export const importanceText: Record<Importance, string> = {
  optional: "text-foreground/60",
  mandatory: "text-amber-600",
  critical: "text-red-600",
}
// Selected (filled) segment colour.
const fill: Record<Importance, string> = {
  optional: "bg-foreground/60 text-background",
  mandatory: "bg-amber-500 text-white",
  critical: "bg-red-500 text-white",
}
const labelText: Record<Importance, string> = {
  optional: "Optional",
  mandatory: "Mandatory",
  critical: "Critical",
}

// 3-state segmented toggle where each segment carries its importance colour — the
// selected one fills with that colour, the others show the colour as text. Used in
// the add-step form and the new-step panel.
export function ImportanceToggle({
  value, onChange, disabled = false,
}: {
  value: Importance
  onChange: (v: Importance) => void
  disabled?: boolean
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border text-[11px] font-semibold">
      {IMPORTANCE_ORDER.map(imp => (
        <button
          key={imp}
          disabled={disabled}
          onClick={() => onChange(imp)}
          className={`px-2.5 py-1 transition-colors disabled:cursor-default ${
            value === imp ? fill[imp] : `${importanceText[imp]} hover:bg-muted`
          }`}
        >
          {labelText[imp]}
        </button>
      ))}
    </div>
  )
}
