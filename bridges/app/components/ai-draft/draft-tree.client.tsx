"use client"

import { ChevronRight, Folder, FolderOpen, FileText, Sparkles, Plug, Bot, Rocket, Trash2 } from "lucide-react"
import type { AgentNode, Draft, GroupKind, RefEntry } from "@/lib/ai-draft/draft-format"

// Left tree for /ai-draft-settings, following the architecture/patterns tree look:
// chevron folders, amber `declared` label, (req) badge for `pending`. Three levels:
// agent folder → (instruction docs · SKILLS group · MCP group) → reference / draft
// leaves. A real original with no draft is read-only reference (black, dimmed); with a
// draft it renders the draft (overlay → black name + req). STATIC: no blink/animation.
// A pending (req) leaf reveals two actions on hover: Launch (bundle ALL pending drafts
// into one development step) and Delete (this draft, with a confirm modal in the parent).

type Props = {
  agents: AgentNode[]
  selectedId: string | null
  expanded: Set<string>
  onToggle: (id: string) => void
  onSelectDraft: (d: Draft) => void
  onSelectReference: (agentId: string, kind: GroupKind, name: string, label: string) => void
  onSelectGroup: (agentId: string, kind: GroupKind) => void
  onLaunch: () => void
  onDeleteDraft: (d: Draft) => void
}

function row(selected: boolean): string {
  return `flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-xs transition-colors ${
    selected ? "bg-primary/15 text-foreground" : "text-foreground hover:bg-muted/60"
  }`
}

function DraftLeaf({ d, label, selectedId, onSelect, onLaunch, onDeleteDraft, Icon }: {
  d: Draft; label: string; selectedId: string | null; onSelect: (d: Draft) => void
  onLaunch: () => void; onDeleteDraft: (d: Draft) => void; Icon: typeof Sparkles
}) {
  return (
    <div className={`group/leaf relative flex items-center rounded-md ${selectedId === d.id ? "bg-primary/15" : "hover:bg-muted/60"}`}>
      <button
        onClick={() => onSelect(d)}
        style={{ paddingLeft: 2 * 16 + 8 }}
        className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pr-2 text-left text-xs text-foreground"
      >
        <Icon size={13} className="shrink-0 text-foreground/60" />
        <span className={`ml-0.5 truncate font-semibold ${d.declared ? "text-amber-600" : "text-foreground"}`}>{label}</span>
        {d.pending && (
          <span className="ml-1 shrink-0 rounded-full border border-amber-500/50 px-1.5 font-mono text-[9px] font-semibold text-amber-600">req</span>
        )}
      </button>
      {/* Hover actions — only for a pending (req) draft. Launch is global (all drafts);
          Delete is this draft. Delete sits rightmost, per the spec. */}
      {d.pending && (
        <div className="absolute right-1 hidden items-center gap-0.5 group-hover/leaf:flex">
          <button
            onClick={onLaunch}
            title="Launch — bundle all pending drafts into one development step"
            className="rounded p-1 text-foreground/60 transition-colors hover:bg-violet-500/15 hover:text-violet-600"
          >
            <Rocket size={12} />
          </button>
          <button
            onClick={() => onDeleteDraft(d)}
            title="Delete this draft (permanent)"
            className="rounded p-1 text-foreground/60 transition-colors hover:bg-red-500/15 hover:text-red-600"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

function Group({ agentId, kind, label, refs, extras, selectedId, expanded, onToggle, onSelectDraft, onSelectReference, onSelectGroup, onLaunch, onDeleteDraft, Icon }: {
  agentId: string; kind: GroupKind; label: string; refs: RefEntry[]; extras: Draft[]
  selectedId: string | null; expanded: Set<string>; onToggle: Props["onToggle"]
  onSelectDraft: Props["onSelectDraft"]; onSelectReference: Props["onSelectReference"]; onSelectGroup: Props["onSelectGroup"]
  onLaunch: Props["onLaunch"]; onDeleteDraft: Props["onDeleteDraft"]
  Icon: typeof Sparkles
}) {
  const gid = `grp:${agentId}:${kind}`
  const open = expanded.has(gid)
  const count = refs.length + extras.length
  return (
    <div>
      <button
        onClick={() => { onSelectGroup(agentId, kind); onToggle(gid) }}
        style={{ paddingLeft: 1 * 16 + 8 }}
        className={`flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-xs text-foreground transition-colors ${selectedId === gid ? "bg-primary/15" : "hover:bg-muted/60"}`}
      >
        <ChevronRight size={12} className={`shrink-0 text-foreground/60 transition-transform ${open ? "rotate-90" : ""}`} />
        {open ? <FolderOpen size={14} className="shrink-0 text-amber-500" /> : <Folder size={14} className="shrink-0 text-amber-500" />}
        <span className="ml-0.5 truncate font-semibold">{label}</span>
        <span className="ml-auto shrink-0 font-mono text-[10px] text-foreground/50">{count}</span>
      </button>
      {open && (
        <div>
          {count === 0 && <p style={{ paddingLeft: 42 }} className="py-1.5 text-xs text-foreground/40">empty — use Add to: …</p>}
          {refs.map(r => r.draft
            ? <DraftLeaf key={r.name} d={r.draft} label={r.label} selectedId={selectedId} onSelect={onSelectDraft} onLaunch={onLaunch} onDeleteDraft={onDeleteDraft} Icon={Icon} />
            : (
              <button
                key={r.name}
                onClick={() => onSelectReference(agentId, kind, r.name, r.label)}
                style={{ paddingLeft: 2 * 16 + 8 }}
                className={row(selectedId === `ref:${agentId}:${kind}:${r.name}`)}
              >
                <Icon size={13} className="shrink-0 text-foreground/40" />
                <span className="ml-0.5 truncate text-foreground/70">{r.label}</span>
                <span className="ml-1 shrink-0 font-mono text-[9px] uppercase tracking-wide text-foreground/40">real</span>
              </button>
            ))}
          {extras.map(d => <DraftLeaf key={d.id} d={d} label={d.name} selectedId={selectedId} onSelect={onSelectDraft} onLaunch={onLaunch} onDeleteDraft={onDeleteDraft} Icon={Icon} />)}
        </div>
      )}
    </div>
  )
}

export function DraftTree(props: Props) {
  const { agents, selectedId, expanded, onToggle, onSelectDraft, onSelectReference, onSelectGroup, onLaunch, onDeleteDraft } = props
  return (
    <div className="py-2">
      {agents.map(agent => {
        const aid = `agent:${agent.id}`
        const open = expanded.has(aid)
        return (
          <div key={agent.id}>
            <button
              onClick={() => onToggle(aid)}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-muted/60"
            >
              <ChevronRight size={12} className={`shrink-0 text-foreground/60 transition-transform ${open ? "rotate-90" : ""}`} />
              <Bot size={14} className="shrink-0 text-foreground/70" />
              <span className="ml-0.5 truncate font-semibold">{agent.label}</span>
            </button>
            {open && (
              <div>
                {agent.instructions.map(d => (
                  <DraftLeaf key={d.id} d={d} label={d.name} selectedId={selectedId} onSelect={onSelectDraft} onLaunch={onLaunch} onDeleteDraft={onDeleteDraft} Icon={FileText} />
                ))}
                <Group
                  agentId={agent.id} kind="skill" label="SKILLS"
                  refs={agent.skills.refs} extras={agent.skills.extras}
                  selectedId={selectedId} expanded={expanded} onToggle={onToggle}
                  onSelectDraft={onSelectDraft} onSelectReference={onSelectReference} onSelectGroup={onSelectGroup}
                  onLaunch={onLaunch} onDeleteDraft={onDeleteDraft}
                  Icon={Sparkles}
                />
                <Group
                  agentId={agent.id} kind="mcp" label="MCP"
                  refs={agent.mcp.refs} extras={agent.mcp.extras}
                  selectedId={selectedId} expanded={expanded} onToggle={onToggle}
                  onSelectDraft={onSelectDraft} onSelectReference={onSelectReference} onSelectGroup={onSelectGroup}
                  onLaunch={onLaunch} onDeleteDraft={onDeleteDraft}
                  Icon={Plug}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
