"use client"

import { useEffect, useState } from "react"
import { Plus, X, ChevronDown, ChevronUp } from "lucide-react"
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

const HOW_IT_WORKS = [
  {
    num: "01",
    title: "By hand",
    badge: "available",
    body:
      "Pick an agent, choose a group (SKILLS or MCP), write a name and description. " +
      "The draft is saved as a structured markdown file with a machine block — ready for " +
      "any agent to read and apply. No real files are touched until you decide to materialise it.",
  },
  {
    num: "02",
    title: "Via AI agent",
    badge: "available",
    body:
      "Any of the six agents (Claude Code, Codex, Gemini CLI, Qwen Code, Kimi Code, Hermes) " +
      "can call the owner_draft_create_record MCP tool while working on your project. " +
      "The tool generates a structured source skeleton and actionable tasks from the " +
      "agent's description — and publishes the draft here automatically. " +
      "The architect reviews and approves. This is the path where agents propose their own genes.",
  },
  {
    num: "03",
    title: "Materialiser",
    badge: "coming soon",
    body:
      "Once a draft is approved, an agent reads the wish and applies it to the real file — " +
      "creating or updating the actual skill, instruction or MCP connector in the correct " +
      "directory. The draft transitions from wish to live artefact; you see the result " +
      "immediately in /ai-core and /architecture.",
  },
  {
    num: "04",
    title: "Proactive proposals",
    badge: "coming soon",
    body:
      "Agents working on your project will detect recurring patterns and automation " +
      "opportunities — and propose drafts here without being asked. You review the proposals, " +
      "approve what fits, discard what does not. Over time this turns the draft board into " +
      "a living map of your system's evolving intelligence.",
  },
]

type RefSel = { type: "ref"; agentId: string; kind: GroupKind; name: string; label: string }
type DraftSel = { type: "draft"; draft: Draft }
type Selection = RefSel | DraftSel | null
type Group = { agentId: string; kind: GroupKind }

export function AiDraftApp(
  { initialAgent, initialObject, initialTarget }:
  { initialAgent?: string; initialObject?: string; initialTarget?: string } = {},
) {
  const [agents, setAgents] = useState<AgentNode[]>([])
  const [selected, setSelected] = useState<Selection>(null)
  const [adding, setAdding] = useState<Group | null>(null)
  const [activeGroup, setActiveGroup] = useState<Group | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [seeded, setSeeded] = useState(false)
  const [preselected, setPreselected] = useState(false)
  const [howOpen, setHowOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Draft | null>(null)

  async function refresh() {
    const res = await fetch("/api/ai-draft-settings")
    if (!res.ok) return
    const data = await res.json()
    const list: AgentNode[] = data.agents ?? []
    setAgents(list)
    if (!seeded) { setExpanded(new Set(list.map(a => `agent:${a.id}`))); setSeeded(true) }
    // Deep-link from /ai-core (once, if the agent exists):
    //  - object=skills|mcp ("+")  -> preselect that group and open the add-draft form.
    //  - object=instruction (pencil) -> SELECT the agent's instruction draft (by target
    //    name, else its sole instruction — tolerates the /ai-core label vs seeded-name
    //    mismatch, e.g. Kimi shows AGENTS.md but its instruction is KIMI.md). No creation.
    const agent = list.find(a => a.id === initialAgent)
    if (!preselected && agent && initialObject) {
      setExpanded(prev => new Set([...prev, ...list.map(a => `agent:${a.id}`)]))
      if (initialObject === "instruction") {
        const instr = agent.instructions.find(d => d.name === initialTarget) ?? agent.instructions[0]
        if (instr) { setSelected({ type: "draft", draft: instr }); setActiveGroup(null) }
      } else {
        const kind: GroupKind = initialObject === "mcp" ? "mcp" : "skill"
        const grp: Group = { agentId: agent.id, kind }
        setActiveGroup(grp)
        setAdding(grp)
        setExpanded(prev => new Set([...prev, `grp:${agent.id}:${kind}`]))
      }
      setPreselected(true)
    }
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
  // Flow-A "Launch": bundle EVERY pending draft on the page into ONE detailed step,
  // delete them all, and land on /development-steps to see it.
  async function launchAll() {
    const res = await fetch("/api/development-steps", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bundleAll: true }),
    })
    if (!res.ok) return
    window.location.href = "/development-steps"
  }
  // Per-leaf delete — opens a confirm modal first (deletion is permanent).
  async function confirmDeleteDraft() {
    if (!confirmDelete) return
    const res = await fetch(`/api/ai-draft-settings/${confirmDelete.id}`, { method: "DELETE" })
    setConfirmDelete(null)
    if (!res.ok) return
    if (selected?.type === "draft" && selected.draft.id === confirmDelete.id) setSelected(null)
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
        <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-foreground/80">
          The place where your agents evolve. Propose new skills, connectors and instructions — for all six coding
          agents — in one structured staging layer, before anything reaches the real files.
          Your AI can propose drafts here on its own; you review and approve.
        </p>
        <button
          onClick={() => setHowOpen(v => !v)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-foreground/60 underline-offset-2 hover:text-foreground hover:underline transition-colors"
        >
          {howOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {howOpen ? "Collapse" : "Learn how it works"}
        </button>

        {howOpen && (
          <div className="mt-3 max-w-2xl rounded-xl border border-border bg-muted/20 p-5">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
              Four ways to work with this page
            </p>
            <div className="space-y-4">
              {HOW_IT_WORKS.map(item => (
                <div key={item.num} className="flex gap-3">
                  <span className="mt-0.5 shrink-0 font-mono text-[10px] text-foreground/30">{item.num}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{item.title}</span>
                      <span className={
                        "rounded px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide " +
                        (item.badge === "available"
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-foreground/10 text-foreground/40")
                      }>
                        {item.badge}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-foreground/60">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  onLaunch={launchAll}
                  onDeleteDraft={d => setConfirmDelete(d)}
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
                  onCreate={async mode => { await createDraft(selected.agentId, selected.kind, selected.name, mode, selected.name) }}
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

      {/* Permanent-delete confirm modal — the rightmost hover action requires the
          architect to acknowledge the deletion is final before the draft is removed. */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-foreground">Delete this draft?</h3>
            <p className="mt-2 text-xs leading-relaxed text-foreground/70">
              You are about to permanently delete the {confirmDelete.kind} draft
              <span className="font-semibold text-foreground"> “{confirmDelete.name}”</span>.
              This is final and cannot be undone. The real file is not affected.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/60"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteDraft}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
