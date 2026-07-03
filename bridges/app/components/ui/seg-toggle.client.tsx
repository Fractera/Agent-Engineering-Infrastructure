"use client"

// Segmented toggle — the small pill switch used across the app (architecture
// declare panel's static/dynamic, the development-steps NEW/COMPLETED switch, and
// the 3-state importance switch). Generic over the value type so 2- or N-segment
// switches share one component and one look.
export function SegToggle<T extends string | boolean>({
  options, value, onChange, size = "sm",
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  size?: "sm" | "md"
}) {
  const pad = size === "md" ? "px-3 py-1.5" : "px-2.5 py-1"
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border text-[11px] font-semibold">
      {options.map(o => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={`${pad} transition-colors ${
            value === o.value ? "bg-foreground text-background" : "text-foreground/70 hover:bg-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
