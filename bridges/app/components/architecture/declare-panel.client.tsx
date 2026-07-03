"use client"

import { useState } from "react"
import { Plus, X, Loader2 } from "lucide-react"
import { projectApi } from "@/lib/architecture/project-api"
import { slugify } from "@/lib/architecture/projects"
import { SourceExample } from "./source-example.client"
import { SegToggle } from "@/components/ui/seg-toggle.client"
import { ALL_ROLES } from "@/lib/roles"
import { MENU_SLOTS, type MenuSlot, type Visibility, type Integration } from "@/lib/architecture/readme-file"
import type { Requested, QueryParam } from "@/lib/architecture/requested-tree"

// Menu slots + visibility use the frozen-pipeline confirm vocabulary
// (registry.json confirm.labels) — one vocabulary for Hermes and this panel.
const MENU_TITLE: Record<MenuSlot, string> = { top: "Top menu", footer: "Footer", left: "Left drawer", right: "Right drawer" }

// Small multi-select chip used for menu slots and the role list.
function Chip({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
        active ? "border-foreground bg-foreground text-background" : "border-border text-foreground/70 hover:bg-muted"
      }`}
    >
      {label}
    </button>
  )
}

// Two-state segmented toggle wrapper over the shared SegToggle (off=false/on=true).
function BoolToggle({ off, on, value, onChange }: {
  off: string; on: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <SegToggle<boolean>
      options={[{ value: false, label: off }, { value: true, label: on }]}
      value={value}
      onChange={onChange}
    />
  )
}

// The right-side panel opened by "Add page". Declares a requested route — static
// or dynamic, with optional query params — as a spec for the agent. Duplicates
// don't matter (the agent resolves them); nothing is built here.
export function DeclarePanel({
  base = "/",
  onClose,
  onCreated,
}: {
  base?: string
  onClose: () => void
  onCreated: (r: Requested) => void
}) {
  // Declarations under /projects/** are PROJECT declarations: same panel, plus the
  // project-runtime block (cron + external integrations). Detected from the base.
  const isProjectDecl = base === "/projects" || base.startsWith("/projects/")

  const [title, setTitle] = useState("")
  const [dynamic, setDynamic] = useState(false)
  const [useQuery, setUseQuery] = useState(false)
  const [query, setQuery] = useState<QueryParam[]>([])
  const [qKey, setQKey] = useState("")
  const [qValue, setQValue] = useState("")
  const [items, setItems] = useState<string[]>([])
  const [draft, setDraft] = useState("")
  const [example, setExample] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  // Placement & access. Projects default to the layer's own gate (architect+manager,
  // no public menus); pages default to public and no menus until chosen.
  const [menus, setMenus] = useState<MenuSlot[]>([])
  const [visibility, setVisibility] = useState<Visibility>(isProjectDecl ? "rolesOnly" : "public")
  const [roles, setRoles] = useState<string[]>(isProjectDecl ? ["architect", "manager"] : [])
  const [admin, setAdmin] = useState(false)
  const [dashboard, setDashboard] = useState(false)
  // Project runtime (projects only).
  const [cron, setCron] = useState(false)
  const [useIntegrations, setUseIntegrations] = useState(false)
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [intName, setIntName] = useState("")
  const [intKeys, setIntKeys] = useState("")

  // Live preview of the real path this declaration becomes — always starts with
  // "/". The slug is derived the same way the server does (collisions get a
  // numeric suffix there, so this is the base case).
  const slug = slugify(title) || (dynamic ? "param" : "page")
  const seg = dynamic ? `[${slug}]` : slug
  const previewPath = base === "/" ? `/${seg}` : `${base}/${seg}`

  function addItem() {
    const v = draft.trim()
    if (!v) return
    setItems(prev => [...prev, v]); setDraft("")
  }
  function addQuery() {
    const k = qKey.trim()
    if (!k) return
    setQuery(prev => [...prev, { key: k, value: qValue.trim() }]); setQKey(""); setQValue("")
  }
  function toggleMenu(s: MenuSlot) {
    setMenus(prev => prev.includes(s) ? prev.filter(m => m !== s) : [...prev, s])
  }
  function toggleRole(r: string) {
    setRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])
  }
  function addIntegration() {
    const name = intName.trim()
    if (!name) return
    const envKeys = intKeys.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
    setIntegrations(prev => [...prev, { name, envKeys }]); setIntName(""); setIntKeys("")
  }

  async function declare() {
    if (!title.trim()) { setError(dynamic ? "A parameter name is required" : "A route name is required"); return }
    if (visibility === "rolesOnly" && roles.length === 0) { setError("Select at least one role"); return }
    setSaving(true); setError("")
    try {
      const res = await fetch(projectApi("/architecture/requested"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), todo: items, base, dynamic, queryParams: useQuery ? query : [], example,
          menus, visibility, roles: visibility === "rolesOnly" ? roles : [], admin, dashboard,
          ...(isProjectDecl ? { cron, integrations: useIntegrations ? integrations : [] } : {}),
        }),
      })
      if (!res.ok) { setError("Could not save — try again"); return }
      const { requested } = await res.json()
      if (requested) onCreated(requested)
      setTitle(""); setItems([]); setDraft(""); setQuery([]); setDynamic(false); setUseQuery(false); setExample("")
      setMenus([]); setVisibility(isProjectDecl ? "rolesOnly" : "public"); setRoles(isProjectDecl ? ["architect", "manager"] : [])
      setAdmin(false); setDashboard(false); setCron(false); setUseIntegrations(false); setIntegrations([]); setIntName(""); setIntKeys("")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">{isProjectDecl ? "Add a project" : "Add a page"}</h2>
        <button onClick={onClose} className="text-foreground/60 transition-colors hover:text-foreground">
          <X size={14} />
        </button>
      </div>
      <p className="rounded-md border border-border bg-muted/30 px-3 py-1.5 font-mono text-[11px] text-foreground">
        Adding under: <span className="font-semibold">{base}</span>
      </p>

      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Route type</label>
        <BoolToggle off="Static" on="Dynamic" value={dynamic} onChange={setDynamic} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
          {dynamic ? "Dynamic parameter name" : "Route name"}
        </label>
        <input
          type="text"
          placeholder={dynamic ? "e.g. slug, id" : "e.g. Orders"}
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="h-8 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <p className="font-mono text-[11px] text-foreground/70">
          Path: <span className="font-semibold text-foreground">{previewPath}</span>
        </p>
        {error && <span className="text-[11px] font-medium text-red-600">{error}</span>}
      </div>

      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Query params</label>
        <BoolToggle off="None" on="Use query" value={useQuery} onChange={setUseQuery} />
      </div>
      {useQuery && (
        <div className="flex flex-col gap-1.5">
          {query.map((q, i) => (
            <div key={i} className="flex items-center gap-1.5 font-mono text-xs text-foreground">
              <span className="font-semibold">{q.key}</span><span className="text-foreground/50">=</span><span>{q.value || "—"}</span>
              <button onClick={() => setQuery(prev => prev.filter((_, j) => j !== i))} className="ml-auto text-foreground/50 hover:text-red-600">
                <X size={11} />
              </button>
            </div>
          ))}
          <div className="flex gap-1.5">
            <input
              value={qKey}
              onChange={e => setQKey(e.target.value)}
              placeholder="key (e.g. color)"
              className="h-8 w-1/3 rounded-md border border-border bg-background px-2 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="self-center text-foreground/50">=</span>
            <input
              value={qValue}
              onChange={e => setQValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addQuery()}
              placeholder="value (e.g. red)"
              className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button onClick={addQuery} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-foreground/40 text-foreground hover:bg-foreground hover:text-background">
              <Plus size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Placement & access — declared intent; the builder agent writes the real
          menu entries (group.ts manifests) and role gates when it builds. */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Appears in</label>
        <div className="flex flex-wrap gap-1.5">
          {MENU_SLOTS.map(s => (
            <Chip key={s} label={MENU_TITLE[s]} active={menus.includes(s)} onToggle={() => toggleMenu(s)} />
          ))}
        </div>
        {menus.length === 0 && (
          <p className="text-[11px] text-foreground/60">Nowhere — no menu enabled.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Visible to</label>
          <SegToggle<Visibility>
            options={[{ value: "public", label: "Everyone" }, { value: "publicGuest", label: "+ Guest" }, { value: "rolesOnly", label: "Roles" }]}
            value={visibility}
            onChange={setVisibility}
          />
        </div>
        {visibility === "rolesOnly" && (
          <div className="flex flex-wrap gap-1.5">
            {ALL_ROLES.map(r => (
              <Chip key={r} label={r} active={roles.includes(r)} onToggle={() => toggleRole(r)} />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Admin panel</label>
        <BoolToggle off="No" on="Yes" value={admin} onChange={setAdmin} />
      </div>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">User dashboards</label>
        <BoolToggle off="No" on="Yes" value={dashboard} onChange={setDashboard} />
      </div>

      {/* Project runtime — only for declarations under /projects/**. */}
      {isProjectDecl && (
        <>
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">Cron processes</label>
            <BoolToggle off="No" on="Yes" value={cron} onChange={setCron} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">External integrations</label>
            <BoolToggle off="None" on="Use" value={useIntegrations} onChange={setUseIntegrations} />
          </div>
          {useIntegrations && (
            <div className="flex flex-col gap-1.5">
              {integrations.map((it, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-foreground">
                  <span className="font-medium">{it.name}</span>
                  <span className="font-mono text-[10px] text-foreground/60">{it.envKeys.join(", ") || "—"}</span>
                  <button onClick={() => setIntegrations(prev => prev.filter((_, j) => j !== i))} className="ml-auto text-foreground/50 hover:text-red-600">
                    <X size={11} />
                  </button>
                </div>
              ))}
              <div className="flex gap-1.5">
                <input
                  value={intName}
                  onChange={e => setIntName(e.target.value)}
                  placeholder="automation (e.g. YouTube API)"
                  className="h-8 w-1/2 rounded-md border border-border bg-background px-2 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <input
                  value={intKeys}
                  onChange={e => setIntKeys(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addIntegration()}
                  placeholder="ENV keys (comma-separated)"
                  className="h-8 flex-1 rounded-md border border-border bg-background px-2 font-mono text-xs text-foreground placeholder:font-sans placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button onClick={addIntegration} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-foreground/40 text-foreground hover:bg-foreground hover:text-background">
                  <Plus size={12} />
                </button>
              </div>
              <p className="text-[11px] text-foreground/60">
                API keys are recorded in the declaration; values land in <span className="font-mono">app/.env.local</span> (+ rebuild) at execution.
              </p>
            </div>
          )}
        </>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground">To-do</label>
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-foreground">
            <span className="text-foreground/60">•</span>
            <span className="flex-1 font-medium">{it}</span>
            <button onClick={() => setItems(prev => prev.filter((_, j) => j !== i))} className="text-foreground/50 hover:text-red-600">
              <X size={11} />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a task…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addItem()}
            className="h-8 flex-1 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button onClick={addItem} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-foreground/40 text-foreground hover:bg-foreground hover:text-background">
            <Plus size={12} />
          </button>
        </div>
      </div>

      <SourceExample value={example} onChange={setExample} />

      <button
        onClick={declare}
        disabled={saving || !title.trim()}
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {saving && <Loader2 size={11} className="animate-spin" />}
        {isProjectDecl ? "Declare project" : "Declare page"}
      </button>
    </div>
  )
}
