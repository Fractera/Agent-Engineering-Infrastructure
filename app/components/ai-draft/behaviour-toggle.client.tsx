"use client"

import type { DraftTier } from "@/lib/ai-draft/draft-format"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"

// Read-only vs mutating for an MCP tool. The "mutating" axis means something different
// at each access tier — own session / own records / shared config (MCP-REGISTRY §8.3) —
// so the hover hint on each tab changes with the selected tier. Reused by the add form
// and the draft detail so the copy lives in one place.
const BEHAVIOUR_HINT: Record<DraftTier, { readonly: string; mutating: string }> = {
  public: {
    readonly: "Answers an anonymous visitor without changing anything. Example: \"How does your company work?\" returns the answer (e.g. a link to the relevant page).",
    mutating: "Writes only the visitor's own session/view — never shared state. Example: \"Switch the site to Spanish\" changes the language for this visitor only.",
  },
  user: {
    readonly: "Reads the signed-in user's own records without changing anything. Example: \"Show my orders from last year.\"",
    mutating: "Writes the signed-in user's own data, scoped to their identity. Example: \"Update my delivery address.\" Confirms before applying.",
  },
  owner: {
    readonly: "Reads workspace-wide state without changing anything. Example: \"List the current footer pages.\"",
    mutating: "Changes shared config or global defaults for the whole workspace. Example: \"Set the default theme to dark for everyone.\" Always confirms before applying (§8.2).",
  },
}

const OPTS: { value: boolean; label: string; key: "readonly" | "mutating" }[] = [
  { value: false, label: "Read-only", key: "readonly" },
  { value: true, label: "Mutating", key: "mutating" },
]

export function BehaviourToggle({
  tier, value, onChange,
}: {
  tier: DraftTier
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <TooltipProvider>
      <div className="inline-flex overflow-hidden rounded-md border border-border text-[11px] font-semibold">
        {OPTS.map(o => (
          <Tooltip key={o.key}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onChange(o.value)}
                className={`px-2.5 py-1 transition-colors ${
                  value === o.value ? "bg-foreground text-background" : "text-foreground/70 hover:bg-muted"
                }`}
              >
                {o.label}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] leading-relaxed">
              {BEHAVIOUR_HINT[tier][o.key]}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}
