"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import type { Draft, DraftMode } from "@/lib/ai-draft/draft-format"
import { SegToggle } from "@/components/ui/seg-toggle.client"
import { AccordionItem } from "@/components/patterns/accordion-item.client"
import { DraftDanger } from "./draft-danger.client"

// crypto.randomUUID() is only defined in secure contexts; this server is reached over
// plain HTTP in IP-mode (http://<ip>:3000), where it is undefined and throws. Fall back
// to a random id there so adding a wish / ordering removal never crashes.
function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID()
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// Right-hand detail of a draft. By design (ТЗ) it is title + a supplement/replace
// switch + a Wishes list + a Danger zone — NO description, NO Source. The switch and
// the wishes are the whole draft: an agent reads them and applies the change to the
// real file. Mode and tasks save directly (PATCH). Mirrors the patterns detail minus
// the description/Source, plus the supplement/replace toggle at the top.
export function DraftDetail({
  draft, onPatch, onRemove,
}: {
  draft: Draft
  onPatch: (patch: Record<string, unknown>) => Promise<void>
  onRemove: () => Promise<void>
}) {
  const kindLabel = draft.kind === "instruction" ? "Instruction" : draft.kind === "mcp" ? "MCP connector" : "Skill"
  const overlay = draft.target ? `over ${draft.target}` : "new record"
  const [open, setOpen] = useState<Set<string>>(new Set(["wishes"]))
  const [wish, setWish] = useState("")

  function toggle(t: string) {
    setOpen(prev => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next
    })
  }
  const wishes = draft.tasks.filter(t => t.kind !== "delete")
  async function addWish() {
    const body = wish.trim()
    if (!body) return
    setWish("")
    await onPatch({ tasks: [...draft.tasks, { id: genId(), body, kind: "todo" }] })
  }
  async function removeWish(id: string) {
    await onPatch({ tasks: draft.tasks.filter(t => t.id !== id) })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-foreground/50">{kindLabel} · {overlay}</span>
          {draft.pending && (
            <span className="rounded-full border border-amber-500/50 px-1.5 font-mono text-[9px] font-semibold text-amber-600">req</span>
          )}
        </div>
        <h2 className="mt-1.5 text-sm font-bold text-foreground">{draft.name}</h2>

        {/* supplement / replace — how the agent should apply this draft (same switch as architecture). */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/60">Apply as</span>
          <SegToggle<DraftMode>
            options={[{ value: "supplement", label: "Supplement" }, { value: "replace", label: "Replace" }]}
            value={draft.mode}
            onChange={m => onPatch({ mode: m })}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-col gap-1.5">
          <AccordionItem title="Wishes (to-do)" open={open.has("wishes")} onToggle={() => toggle("wishes")}>
            <div className="flex flex-col gap-1.5">
              {wishes.map(t => (
                <div key={t.id} className="flex items-center gap-2 text-xs text-foreground">
                  <span className="shrink-0 text-foreground/60">•</span>
                  <span className="flex-1">{t.body}</span>
                  <button onClick={() => removeWish(t.id)} className="shrink-0 text-foreground/50 transition-colors hover:text-red-600">
                    <X size={11} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Describe a wish for the agent to apply…"
                  value={wish}
                  onChange={e => setWish(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addWish()}
                  className="h-8 flex-1 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button onClick={addWish} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-foreground/40 text-foreground transition-colors hover:bg-foreground hover:text-background">
                  <Plus size={12} />
                </button>
              </div>
              <p className="text-[11px] text-foreground/40">
                Wishes are what an agent reads and applies to the real {kindLabel.toLowerCase()} file. A wish
                marks this draft (req) until applied.
              </p>
            </div>
          </AccordionItem>

          <AccordionItem title="Danger zone" open={open.has("danger")} onToggle={() => toggle("danger")} tone="danger">
            <DraftDanger
              draft={draft}
              onOrderDeletion={(reason, outcome) => onPatch({ tasks: [...draft.tasks, { id: genId(), body: reason, outcome: outcome || null, kind: "delete" }] })}
              onDiscardAll={() => onPatch({ tasks: [] })}
              onRemove={onRemove}
            />
          </AccordionItem>
        </div>
      </div>
    </div>
  )
}
