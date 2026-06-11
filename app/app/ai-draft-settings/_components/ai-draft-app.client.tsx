"use client"

import { useEffect, useState } from "react"
import { Plus, X } from "lucide-react"
import type { AgentNode, Draft, DraftMode, GroupKind } from "@/lib/ai-draft/draft-format"
import { DraftTree } from "@/components/ai-draft/draft-tree.client"
import { DraftDetail } from "@/components/ai-draft/draft-detail.client"
import { ReferenceDetail } from "@/components/ai-draft/reference-detail.client"
import { AddDraftForm } from "@/components/ai-draft/add-draft-form.client"

// AI Draft Settings — a filesystem-backed intermediate layer, mirroring /architecture
// and /patterns but in STATIC mode (no live polling, no blink, no auto-reveal). The
// architect writes free-form wishes here — to supplement or replace the real files that
// drive the six agents (Hermes + the five coding platforms). The wishes live as drafts
// under AI-DRAFT-SETTINGS/; an agent reads them later and applies the change to the real
// instruction / skill / MCP file. The originals are never touched from here.

const DESCRIPTION =
  "A staging layer between you and the files that drive your agents. Here the architect " +
  "writes wishes in free form — new instructions, skills or connectors, or changes to the " +
  "existing ones — without editing the real files. You describe what you want (to supplement " +
  "or to replace), then ask the AI to turn these notes into the real documents and place them " +
  "where they belong. You work only on this mirror; an agent applies it to the originals."

type RefSel = { type: "ref"; agentId: string; kind: GroupKind; name: string; label: string }
type DraftSel = { type: "draft"; draft: Draft }
type Selection = RefSel | DraftSel | null
type Group = { agentId: string; kind: GroupKind }

export function AiDraftApp() {
  const [agents, setAgents] = useState<AgentNode[]>([])
  const [selected, setSelected] = useState<Selection>(null)
  const [adding, setAdding] = useState<Group | null>(null)
  const [activeGroup, setActiveGroup] = useState<Group | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [seeded, setSeeded] = useState(false)

  async function refresh() {
    const res = await fetch("/api/ai-draft-settings")
    if (!res.ok) return
    const data = await res.json()
    const list: AgentNode[] = data.agents ?? []
    setAgents(list)
    if (!seeded) { setExpanded(new Set(list.map(a => `agent:${a.id}`))); setSeeded(true) }
  }
  useEffect(() => { refresh() }, [])

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function groupOf(d: Draft): Group | null {
    return d.kind === "skill" || d.kind === "mcp" ? { agentId: d.agent, kind: d.kind } : null
  }
  function selectDraft(d: Draft) { setSelected({ type: "draft", draft: d }); setAdding(null); setActiveGroup(groupOf(d)) }
  function selectReference(agentId: string, kind: GroupKind, name: string, label: string) {
    setSelected({ type: "ref", agentId, kind, name, label }); setAdding(null); setActiveGroup({ agentId, kind })
  }
  function selectGroup(agentId: string, kind: GroupKind) { setActiveGroup({ agentId, kind }); setSelected(null); setAdding(null) }

  const agentLabel = (id: string) => agents.find(a => a.id === id)?.label ?? id

  async function patchDraft(patch: Record<string, unknown>) {
    if (selected?.type !== "draft") return
    const res = await fetch(`/api/ai-draft-settings/${selected.draft.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    })
    if (!res.ok) return
    const { draft } = await res.json()
    if (draft) setSelected({ type: "draft", draft })
    await refresh()
  }
  async function removeDraft() {
    if (selected?.type !== "draft") return
    const res = await fetch(`/api/ai-draft-settings/${selected.draft.id}`, { method: "DELETE" })
    if (!res.ok) return
    setSelected(null)
    await refresh()
  }
  async function createDraft(agentId: string, kind: GroupKind, name: string, mode: DraftMode, target: string | null): Promise<boolean> {
    const res = await fetch("/api/ai-draft-settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent: agentId, kind, name, mode, target }),
    })
    if (!res.ok) return false
    const { draft } = await res.json()
    if (draft) { setSelected({ type: "draft", draft }); setAdding(null); setExpanded(prev => new Set([...prev, `grp:${agentId}:${kind}`])) }
    await refresh()
    return true
  }

  const addEnabled = !!activeGroup
  const addLabel = activeGroup ? `Add to: ${agentLabel(activeGroup.agentId)} / ${activeGroup.kind === "mcp" ? "MCP" : "SKILLS"}` : "Add to: …"

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <a href="/" className="font-mono text-xs text-foreground/70 transition-colors hover:text-foreground">← back</a>
        <h1 className="mt-1 text-xl font-bold text-foreground">AI draft settings</h1>
        <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-foreground/80">{DESCRIPTION}</p>

        <div className="mt-4 overflow-x-auto">
          <div className="flex h-[72vh] min-w-[720px] overflow-hidden rounded-xl border border-border">
            <div className="flex w-1/2 flex-col border-r border-border bg-muted/10">
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">Agents</span>
                <button
                  onClick={() => { if (activeGroup) { setSelected(null); setAdding(adding ? null : activeGroup) } }}
                  disabled={!addEnabled}
                  title={addEnabled ? addLabel : "Select a SKILLS or MCP group first"}
                  className="inline-flex h-7 min-w-0 items-center gap-1.5 rounded-md border border-foreground/40 px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-foreground"
                >
                  {adding ? <X size={11} className="shrink-0" /> : <Plus size={11} className="shrink-0" />}
                  <span className="truncate">{adding ? "Close" : addLabel}</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <DraftTree
                  agents={agents}
                  selectedId={selected?.type === "draft" ? selected.draft.id : selected?.type === "ref" ? `ref:${selected.agentId}:${selected.kind}:${selected.name}` : null}
                  expanded={expanded}
                  onToggle={toggle}
                  onSelectDraft={selectDraft}
                  onSelectReference={selectReference}
                  onSelectGroup={selectGroup}
                />
              </div>
            </div>
            <div className="w-1/2 overflow-y-auto">
              {adding ? (
                <AddDraftForm
                  agentLabel={agentLabel(adding.agentId)}
                  kind={adding.kind}
                  onClose={() => setAdding(null)}
                  onCreate={(name, mode) => createDraft(adding.agentId, adding.kind, name, mode, null)}
                />
              ) : selected?.type === "draft" ? (
                <DraftDetail draft={selected.draft} onPatch={patchDraft} onRemove={removeDraft} />
              ) : selected?.type === "ref" ? (
                <ReferenceDetail
                  agentId={selected.agentId}
                  kind={selected.kind}
                  name={selected.name}
                  label={selected.label}
                  onCreate={mode => createDraft(selected.agentId, selected.kind, selected.name, mode, selected.name)}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-10 text-center">
                  <p className="max-w-xs text-xs text-foreground/60">
                    Select an agent document, skill or MCP on the left — or pick a SKILLS / MCP group and use Add to: … to draft a new one.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
