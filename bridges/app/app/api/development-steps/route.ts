import { NextRequest, NextResponse } from "next/server"
import { serviceApiGate } from "@/lib/service-auth"
import { createStep, updateStep, type Importance, type StepTask } from "@/lib/dev-steps/step-file"
import { listTree, readDraft, deleteDraft } from "@/lib/ai-draft/draft-file"
import type { Draft, DraftTree } from "@/lib/ai-draft/draft-format"
import { scanTree } from "@/lib/architecture/fs-scan"
import { readRouteMeta, removeRouteReadme, clearTasks, decodePath, type Query } from "@/lib/architecture/readme-file"

// Create a development step. FS source of truth, no DB — same write path for the human
// UI and an agent. Shapes:
//   POST { name, importance }       → an empty step the user fills in.
//   POST { draftId }                → promote ONE AI-draft into a step, then delete it.
//   POST { bundleAll: true }        → flow-A "Launch": every PENDING draft on
//                                     /ai-draft-settings becomes ONE step, drafts removed.
//   POST { bundleArchitecture:true} → flow-B "Launch" (step 126): every PENDING record on
//                                     /architecture (declared pages/endpoints + live routes
//                                     with open tasks) becomes ONE step; the source records
//                                     are removed (declared READMEs snapped, tasks cleared).
//   POST { path }                   → promote ONE architecture record by path, then remove it.
const VALID: Importance[] = ["optional", "mandatory", "critical"]

// ── flow-B: /architecture records → one step (step 126) ──────────────────────
// A pending record is a declared route (README, not built) OR a live route with
// open tasks — the same set the tree marks with the (req) badge.
type ArchRecord = {
  path: string
  title: string
  kind: "page" | "api"
  declared: boolean
  base?: string
  dynamic?: boolean
  query?: Query[]
  todos: string[]
  deletes: { body: string; outcome?: string | null }[]
}

async function gatherArchRecords(): Promise<ArchRecord[]> {
  const scan = await scanTree()
  const declaredPaths = new Set(scan.requested.map(r => decodePath(r.id)))
  const records: ArchRecord[] = []
  // Declared routes (README, no built file) — always pending.
  for (const r of scan.requested) {
    const path = decodePath(r.id)
    const meta = await readRouteMeta(path)
    const tasks = meta?.tasks ?? []
    records.push({
      path, title: r.title, kind: r.kind, declared: true,
      base: r.base, dynamic: r.dynamic, query: r.query,
      todos: tasks.filter(t => t.kind === "todo").map(t => t.body),
      deletes: tasks.filter(t => t.kind === "delete").map(t => ({ body: t.body, outcome: t.outcome })),
    })
  }
  // Live routes carrying open tasks (not already a declared record).
  for (const [path, s] of Object.entries(scan.tasksByPath)) {
    if (s.count <= 0 || declaredPaths.has(path)) continue
    const meta = await readRouteMeta(path)
    if (!meta) continue
    records.push({
      path, title: meta.title, kind: meta.kind, declared: false,
      todos: meta.tasks.filter(t => t.kind === "todo").map(t => t.body),
      deletes: meta.tasks.filter(t => t.kind === "delete").map(t => ({ body: t.body, outcome: t.outcome })),
    })
  }
  return records
}

function archKindLabel(kind: "page" | "api"): string { return kind === "api" ? "endpoint" : "page" }

function archSection(r: ArchRecord, i: number): string {
  const what = r.declared ? `declared ${archKindLabel(r.kind)} — build it` : `live route — apply changes`
  const lines = [`### ${i + 1}. ${r.path} · ${what}`, "", `- Title: ${r.title}`, `- Kind: ${archKindLabel(r.kind)}`]
  if (r.declared) lines.push(`- Base: ${r.base ?? "/"}`, `- Dynamic: ${r.dynamic ? "yes ([slug])" : "no"}`)
  if (r.query?.length) lines.push(`- Query: ${r.query.map(q => `${q.key}=${q.value || "—"}`).join(", ")}`)
  if (r.todos.length) lines.push("", "To build / change:", ...r.todos.map(t => `- ${t}`))
  if (r.deletes.length) lines.push("", "Deletion requests:", ...r.deletes.map(d => `- ${d.body}${d.outcome ? ` → ${d.outcome}` : ""}`))
  return lines.join("\n")
}

function bundleArchitectureBrief(records: ArchRecord[]): string {
  const head = [
    `This step bundles ${records.length} record${records.length === 1 ? "" : "s"} from /architecture (flow-B).`,
    "Build each declared page/endpoint and apply each live-route to-do / deletion request.",
    "The originals are removed from the page — the spec now lives here. Each section is one record.",
    "For a declared page, decide the access shape (public|private|public+guest) per HOW-USE-AUTH.md,",
    "then scaffold with scaffold-declared-route-into-component-skeleton before writing domain code.",
  ]
  return [head.join("\n"), ...records.map(archSection)].join("\n\n")
}

function archStepTask(r: ArchRecord, i: number): StepTask {
  return { id: `a${i + 1}`, body: r.declared ? `Build ${archKindLabel(r.kind)} ${r.path}` : `Apply changes to ${r.path}` }
}

async function removeArchRecord(r: ArchRecord): Promise<void> {
  if (r.declared) await removeRouteReadme(r.path)
  else await clearTasks(r.path)
}

function allDrafts(tree: DraftTree): Draft[] {
  const out: Draft[] = []
  for (const a of tree.agents) {
    out.push(...a.instructions)
    for (const r of a.skills.refs) if (r.draft) out.push(r.draft)
    out.push(...a.skills.extras)
    for (const r of a.mcp.refs) if (r.draft) out.push(r.draft)
    out.push(...a.mcp.extras)
  }
  return out
}

// One draft → a labelled section of the bundled step description.
function section(d: Draft, i: number): string {
  const where = d.target ? `over ${d.target}` : "new record"
  const lines = [`### ${i + 1}. ${d.kind} — "${d.name}" · ${d.agent} (${d.mode}, ${where})`]
  if (d.source.trim()) lines.push("", "```", d.source.trim(), "```")
  const wishes = d.tasks.filter(t => t.kind !== "delete")
  if (wishes.length) { lines.push("", "Wishes:", ...wishes.map(w => `- ${w.body}`)) }
  const dels = d.tasks.filter(t => t.kind === "delete")
  if (dels.length) { lines.push("", "Deletion requests:", ...dels.map(w => `- ${w.body}${w.outcome ? ` → ${w.outcome}` : ""}`)) }
  return lines.join("\n")
}

function bundleBrief(drafts: Draft[]): string {
  const head = [
    `This step bundles ${drafts.length} wish${drafts.length === 1 ? "" : "es"} captured on /ai-draft-settings.`,
    "Apply each to the real file of its agent — the originals are never edited from the draft page;",
    "an agent reads this brief and makes the change. Each section is one wish.",
  ]
  return [head.join("\n"), ...drafts.map(section)].join("\n\n")
}

export async function POST(req: NextRequest) {
  if (!(await serviceApiGate(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const body = await req.json().catch(() => ({}))

  // Launch: bundle every pending draft into one step, then remove them all (flow-A).
  if (body?.bundleAll) {
    const pending = allDrafts(await listTree()).filter(d => d.pending)
    if (pending.length === 0) {
      return NextResponse.json({ error: "No pending drafts to send" }, { status: 400 })
    }
    const step = await createStep(`Apply ${pending.length} AI-draft ${pending.length === 1 ? "wish" : "wishes"}`, "mandatory")
    const tasks: StepTask[] = pending.map((d, i) => ({
      id: `d${i + 1}`, body: `Materialize the ${d.kind} "${d.name}" for ${d.agent} (mode ${d.mode}).`,
    }))
    const full = await updateStep(step.id, { description: bundleBrief(pending), tasks })
    for (const d of pending) await deleteDraft(d.id)
    return NextResponse.json({ step: full ?? step, drafted: pending.length }, { status: 201 })
  }

  // flow-B Launch: bundle every pending /architecture record into one step, then
  // remove the source records (declared READMEs snapped, live-route tasks cleared).
  if (body?.bundleArchitecture) {
    const records = await gatherArchRecords()
    if (records.length === 0) {
      return NextResponse.json({ error: "No pending architecture records to send" }, { status: 400 })
    }
    const step = await createStep(`Build ${records.length} architecture record${records.length === 1 ? "" : "s"}`, "mandatory")
    const tasks: StepTask[] = records.map(archStepTask)
    const full = await updateStep(step.id, { description: bundleArchitectureBrief(records), tasks })
    for (const r of records) await removeArchRecord(r)
    return NextResponse.json({ step: full ?? step, architected: records.length }, { status: 201 })
  }

  // Promote a single architecture record by path, then remove it.
  if (body?.path) {
    const path = String(body.path)
    const rec = (await gatherArchRecords()).find(r => r.path === path)
    if (!rec) return NextResponse.json({ error: "Architecture record not found" }, { status: 404 })
    const step = await createStep(archStepTask(rec, 0).body, "mandatory")
    const full = await updateStep(step.id, { description: bundleArchitectureBrief([rec]), tasks: [archStepTask(rec, 0)] })
    await removeArchRecord(rec)
    return NextResponse.json({ step: full ?? step, architected: 1 }, { status: 201 })
  }

  // Promote a single draft, then remove it.
  if (body?.draftId) {
    const draft = await readDraft(String(body.draftId))
    if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 })
    const step = await createStep(draft.name || `${draft.kind} draft`, "mandatory")
    const full = await updateStep(step.id, { description: bundleBrief([draft]), tasks: [{ id: "d1", body: `Materialize the ${draft.kind} "${draft.name}" for ${draft.agent}.` }] })
    await deleteDraft(draft.id)
    return NextResponse.json({ step: full ?? step, draftDeleted: true }, { status: 201 })
  }

  // Direct creation: an empty step the user (or agent) fills in.
  const { name, importance } = body
  if (!name?.trim()) {
    return NextResponse.json({ error: "A step name is required" }, { status: 400 })
  }
  const imp: Importance = VALID.includes(importance) ? importance : "optional"
  const step = await createStep(String(name).trim(), imp)
  return NextResponse.json({ step }, { status: 201 })
}
