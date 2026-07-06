#!/usr/bin/env node
// orchestrate-project-by-steps — the FROZEN PROCESS for PROJECT (automation) decomposition.
//
// Sibling of orchestrate-content-by-steps, but a DIFFERENT machine. From the content engine we take
// ONLY THE IDEA (freeze the process: decompose + materialize the whole sub-step queue to disk BEFORE
// any development), not the mechanism. The content engine decomposes deterministically by file STATE
// and DEPLOYS each sub-step in one process. A project is decomposed by a MODEL (Hermes proposes a
// graph of nodes), the engine only PLANS / VALIDATES / DOCUMENTS / MATERIALIZES, and the real
// development of each node is done LATER by a coding agent in its own session. So there is NO per-node
// deploy and NO deployment_records gate here — the gate is SPEC COMPLETENESS (design D1, step 184).
//
// Pipeline (built across sub-sessions D1.1 → D1.2 → D1.3):
//   proposed node graph (--plan) ──►
//     1. NORMALIZE     — slug ids (rule 166), UPPER_SNAKE envKeys, kind defaults, dedup
//     2. VALIDATE DAG  — dependsOn resolve to real nodes, no cycles, a root exists
//     3. VALIDATE SPEC — GATE: every node has task+description+todo, io declared, keys well-formed,
//                        and the readme plan carries all mandatory sections. Incomplete → needs_spec.
//     4. ORDER SHEET   — resolved human node lines + stable approve token os-<hash(graph)>,
//                        plus announce_text + confirm_instruction (the model relays these VERBATIM)
//     5. MATERIALIZE   — the whole queue on disk BEFORE any work: one rich NEW-STEPS/<NN>-<slug>.md
//                        SPEC file per node + one NEW-STEPS/<NN>-coder-handoff-<slug>.md per coder-built
//                        node (§4.3) + the project-root README.md GENERATED from the graph (§4.1, D2)
//                        + the EXECUTION SCHEMA (D6, contract R6): the diagram _data/flow.ts (derived,
//                        always rewritten) and the durable workflow _workflow/definition.ts (generated
//                        only when absent/starter; kept files are validated for isomorphism).
//     6. RESUME        — stable token; a cold re-run skips finished sub-steps (composite key <kind>:<seq>)
//
// A real (materializing) run REQUIRES --approve <order_sheet.id> — the token issued by --dry-run for the
// exact plan the owner confirmed. --dry-run writes NOTHING. The SPEC GATE fires in both modes. This engine
// never deploys or executes a node — it PLANS / VALIDATES / DOCUMENTS / MATERIALIZES; a coder builds each
// node later in its own session (D3). D1.3 added the coder-handoff step + the human approve/announce protocol.
//
// Graph contract v2 (schema v2 / engine 0.8 — the AUTOMATION ONTOLOGY, step 188-R; canon:
// CRUD-DOCS/workspace-standards/automation-ontology.md — the 12-entity glossary every model reads):
//   graph: { category?, slug?, project{purpose,efficiency,reuse,result},
//            actions?: [{ id, title, description, color?, hooks:[{phrase,lang}], condition?, channel }],
//            state?:   [{ id, storage, purpose }],
//            nodes[] }
//   node: { id, title, kind, actions: string[]|"all", condition?, errorPolicy?, state?: string[],
//           description, task, tools[], envKeys[], io{in,out}, todo[], dependsOn[] }
//   kind ∈ "trigger" | "router" | "step" | "transform"  ("action" is accepted as a legacy alias
//   of "step" — the word Action now names the first-class automation entity, never a node kind)
//   errorPolicy ∈ "retry-next-tick" | "soft-degrade" | "fail-run" (optional; conventions apply)
// Back-compat: a v1 graph (no actions[]/state[]) normalizes to actions:"all" on every node and
// validates exactly as before.
//
// Usage:
//   node orchestrate-project-by-steps.mjs --out <slot-root> \
//     ( --plan '<graph JSON>' | --plan-file <path.json> ) \
//     [--category <cat>] [--slug <proj>] [--owner-lang ru|en] [--dry-run] [--approve os-<token>]
//   graph JSON is either a bare array of nodes, or { category?, slug?, project{purpose,efficiency,
//   reuse,result}, nodes[] }. --category/--slug override the graph. --plan-file avoids shell quoting.
//
// Self-sufficient: a lone CLI agent runs it directly (a project may have only Codex, no Hermes);
// the MCP bridge (D5) will spawn it with the same contract. Deterministic; in D1.1 it writes NOTHING.

import { mkdir, writeFile, readFile, readdir, rename, stat } from "node:fs/promises"
import { resolve, join, dirname } from "node:path"
import { createHash } from "node:crypto"

const KINDS = ["trigger", "router", "step", "transform"]
const KIND_ALIASES = { action: "step" } // v1 graphs said "action" for a work node; Action is an entity now
const ERROR_POLICIES = ["retry-next-tick", "soft-degrade", "fail-run"]
// The CLOSED set of records-table column renderers (ontology entity 12 Record). A new column is
// DATA in the graph's record.fields[]; a genuinely new visual = a new type here + the primitive's
// record-cell renderer + a canon gate. Kept in lockstep with record-cell.client.tsx.
const COLUMN_TYPES = ["badge", "text", "longtext", "date", "link", "actions"]
// Identifier guard for SQL-facing names (record.table, field.source) — returns "" if not a plain
// identifier, so a bad name is caught by the gate and never reaches generated SQL.
const identOf = s => { const v = String(s ?? "").trim(); return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v) ? v : "" }
// Action colors — stable tokens the UI maps to theme-aware classes; auto-assigned by declaration
// order when the graph omits `color`.
const ACTION_COLORS = ["blue", "amber", "green", "violet", "rose", "cyan", "orange", "teal"]
const README_SECTIONS = ["purpose", "efficiency", "reuse", "result"] // §4.1 minus the graph-derived "how it works"
const STEP_ROOT = "DEVELOPMENT-STEPS", NEW_DIR = "NEW-STEPS", DONE_DIR = "COMPLETED-STEPS"
const pad = n => String(n).padStart(2, "0")

function parseArgs(argv) {
  const a = {}
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]; if (!k.startsWith("--")) continue
    const key = k.slice(2), next = argv[i + 1]
    if (next === undefined || next.startsWith("--")) a[key] = true; else { a[key] = next; i++ }
  }
  return a
}
const exists = async p => { try { await stat(p); return true } catch { return false } }
// slug id — a stable English identifier forever (rule 166). Same shape as the content engine.
const slugify = s => String(s ?? "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50)
// UPPER_SNAKE for env keys (materialized later via persist-env-var-with-rebuild, step 143 — never hardcoded).
const upperSnake = s => String(s ?? "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "")
const str = s => (typeof s === "string" ? s.trim() : "")
const arr = v => (Array.isArray(v) ? v : (v == null ? [] : [v]))
// Human title fallback from a slug id ("publish-daily" → "Publish daily"). Table cells must not break
// the markdown pipe grid — escape pipes, flatten newlines, clip long values.
const humanize = s => String(s ?? "").replace(/-/g, " ").replace(/^\w/, c => c.toUpperCase()).trim()
const mdCell = s => String(s ?? "").replace(/\|/g, "\\|").replace(/\s*\n+\s*/g, " ").trim()
const clip = (s, n) => { const c = mdCell(s); return c.length > n ? c.slice(0, n - 1) + "…" : c }
// The project-root README lives at the frozen project-page primitive's mount (step 178) — the SAME file,
// now BORN from the decomposition rather than a static stub. Casing README.md is preserved (convention 178).
const projectReadmeRel = (category, slug) => `app/(projects)/projects/${category}/${slug}/README.md`

// ── 1. NORMALIZE ─────────────────────────────────────────────────────────────
// Turn a loosely-proposed graph (model output) into the canonical node contract. Never invents
// semantics — only canonicalizes shapes: ids/keys casing, kind default, io object, dedup by id.
function normalizeGraph(raw, cliCategory, cliSlug) {
  let g = raw
  if (Array.isArray(raw)) g = { nodes: raw }
  if (!g || typeof g !== "object") throw new Error("--plan must be a JSON array of nodes or an object { nodes: [...] }")
  const nodesIn = arr(g.nodes)
  if (!nodesIn.length) throw new Error("--plan produced no nodes (need a non-empty node graph)")

  // ACTIONS registry (ontology entity 5) — first-class named outcomes. Colors are auto-assigned
  // from the palette by declaration order when omitted, so every action is always renderable.
  const actionsSeen = new Set()
  const actions = []
  for (const a0 of arr(g.actions)) {
    const a = a0 && typeof a0 === "object" ? a0 : {}
    const id = slugify(a.id) || slugify(a.title)
    if (!id || actionsSeen.has(id)) continue
    actionsSeen.add(id)
    actions.push({
      id,
      title: str(a.title) || humanize(id),
      description: str(a.description),
      color: str(a.color).toLowerCase() || ACTION_COLORS[actions.length % ACTION_COLORS.length],
      hooks: arr(a.hooks).map(h => {
        const hh = h && typeof h === "object" ? h : { phrase: h }
        return { phrase: str(hh.phrase), lang: str(hh.lang) || "en" }
      }).filter(h => h.phrase),
      condition: str(a.condition) || null,
      channel: str(a.channel),
    })
  }
  const actionIds = new Set(actions.map(a => a.id))
  // STATE registry (ontology entity 10) — declared persistent data between runs.
  const stateSeen = new Set()
  const state = []
  for (const s0 of arr(g.state)) {
    const s = s0 && typeof s0 === "object" ? s0 : {}
    const id = slugify(s.id)
    if (!id || stateSeen.has(id)) continue
    stateSeen.add(id)
    state.push({ id, storage: str(s.storage), purpose: str(s.purpose) })
  }

  // Node `actions`: "all" (trunk — every action flows through) or an explicit id list. Trigger and
  // router nodes default to "all"; when the graph declares NO actions (v1 back-compat) every node
  // defaults to "all" and the action gates pass trivially.
  const normNodeActions = (v, kind) => {
    if (typeof v === "string" && v.trim().toLowerCase() === "all") return "all"
    const list = [...new Set(arr(v).map(slugify).filter(Boolean))]
    if (list.length) return list
    return (kind === "trigger" || kind === "router" || !actions.length) ? "all" : []
  }

  const seen = new Set(), duplicates = []
  const nodes = []
  for (const n0 of nodesIn) {
    const n = n0 && typeof n0 === "object" ? n0 : {}
    const title = str(n.title) || str(n.name)
    let id = slugify(n.id) || slugify(title)
    if (!id) id = `node-${nodes.length + 1}`
    if (seen.has(id)) { duplicates.push(id); continue }        // dedup: keep first
    seen.add(id)
    const io = n.io && typeof n.io === "object" ? n.io : {}
    const rawKind = str(n.kind).toLowerCase()
    const kind = KINDS.includes(rawKind) ? rawKind : (KIND_ALIASES[rawKind] ?? "step")
    nodes.push({
      id,
      title: title || id,
      kind,
      actions: normNodeActions(n.actions, kind),
      condition: str(n.condition) || null,
      errorPolicy: str(n.errorPolicy).toLowerCase() || null,
      state: [...new Set(arr(n.state).map(slugify).filter(Boolean))],
      description: str(n.description),
      task: str(n.task),
      tools: arr(n.tools).map(str).filter(Boolean),
      envKeys: arr(n.envKeys).map(upperSnake).filter(Boolean),
      io: { in: io.in ?? null, out: io.out ?? null },
      todo: arr(n.todo).map(str).filter(Boolean),
      dependsOn: [...new Set(arr(n.dependsOn).map(slugify).filter(Boolean))],
      needsCoder: n.needsCoder === false ? false : true, // every node is coder-built unless opted out
    })
  }
  const proj = (g.project && typeof g.project === "object") ? g.project : {}
  const project = {
    title: str(proj.title),          // optional human name; README falls back to a humanized slug
    purpose: str(proj.purpose),
    efficiency: str(proj.efficiency),
    reuse: str(proj.reuse),
    result: str(proj.result),
  }
  // Records-table columns (ontology entity 12 Record) — an OPTIONAL block. When present the engine
  // generates _data/columns.ts from it (like actions.ts). Kept to the closed, renderable shape;
  // SQL-facing names are identifier-guarded so the gate can refuse a bad one.
  const rawRecord = (g.record && typeof g.record === "object") ? g.record : null
  const record = rawRecord ? {
    table: identOf(rawRecord.table),
    fields: arr(rawRecord.fields).map(f => {
      const o = (f && typeof f === "object") ? f : {}
      return {
        id: slugify(o.id) || slugify(o.header) || "",
        header: str(o.header) || str(o.id),
        // Keep the declared type verbatim (empty → text): an INVALID type is preserved so the
        // validation gate catches it, rather than being silently coerced to a renderable default.
        type: str(o.type).toLowerCase() || "text",
        source: identOf(o.source),
        defaultVisible: o.defaultVisible !== false,
        ...(slugify(o.attr) ? { attr: slugify(o.attr) } : {}),
        ...(o.options && typeof o.options === "object" ? { options: o.options } : {}),
      }
    }).filter(f => f.id),
  } : null
  return {
    category: slugify(cliCategory ?? g.category) || "automation",
    slug: slugify(cliSlug ?? g.slug) || slugify(project.purpose) || "project",
    project,
    actions,
    state,
    nodes,
    ...(record && (record.table || record.fields.length) ? { record } : {}),
    ...(duplicates.length ? { duplicates } : {}),
  }
}

// ── 2. VALIDATE DAG ──────────────────────────────────────────────────────────
// Topology only: every dependsOn resolves to a real node, no cycles, at least one root (indegree 0).
// Returns a topological order used by the order sheet and (D1.2) materialization sequence.
function validateDag(nodes) {
  const errors = []
  const ids = new Set(nodes.map(n => n.id))
  const indeg = new Map(nodes.map(n => [n.id, 0]))
  const adj = new Map(nodes.map(n => [n.id, []]))
  for (const n of nodes) {
    for (const dep of n.dependsOn) {
      if (!ids.has(dep)) { errors.push(`node "${n.id}" dependsOn unknown node "${dep}"`); continue }
      if (dep === n.id) { errors.push(`node "${n.id}" dependsOn itself`); continue }
      adj.get(dep).push(n.id)          // edge dep → n (dep must finish first)
      indeg.set(n.id, indeg.get(n.id) + 1)
    }
  }
  const roots = nodes.filter(n => indeg.get(n.id) === 0).map(n => n.id)
  if (nodes.length && !roots.length) errors.push("no root node (every node depends on another — a cycle)")
  // Kahn topological sort — leftover nodes reveal the cycle.
  const q = [...roots], order = [], deg = new Map(indeg)
  while (q.length) {
    const id = q.shift(); order.push(id)
    for (const m of adj.get(id)) { deg.set(m, deg.get(m) - 1); if (deg.get(m) === 0) q.push(m) }
  }
  if (order.length !== nodes.length) {
    const inCycle = nodes.map(n => n.id).filter(id => !order.includes(id))
    errors.push(`cycle detected among nodes: ${inCycle.join(", ")}`)
  }
  return { ok: errors.length === 0, errors, order, roots }
}

// ── 3. VALIDATE SPEC (THE GATE) ──────────────────────────────────────────────
// Development cannot start until every node is a COMPLETE spec and the readme plan is whole.
// Mirrors the owner's rule (step 184 §3): "specs are validated before the project enters development".
// Hard gate: task+description+todo non-empty, io declared, envKeys well-formed UPPER_SNAKE, kind valid,
// and the project readme plan carries every mandatory section. Missing items are listed explicitly so
// the model knows exactly what to fill. (A tool-without-key mismatch is a soft warning, not a block —
// many nodes legitimately need no secret; a false hard-fail would be worse than a hint.)
function validateSpec(graph) {
  const missing = [], warnings = []
  const ontologyHint = " (automation ontology: CRUD-DOCS/workspace-standards/automation-ontology.md)"
  const actionIds = new Set(graph.actions.map(a => a.id))
  const stateIds = new Set(graph.state.map(s => s.id))
  for (const n of graph.nodes) {
    const where = `node "${n.id}"`
    if (!n.task) missing.push(`${where}: empty task (needs the exhaustive sub-step spec)`)
    if (!n.description) missing.push(`${where}: empty description (needs a one-line summary)`)
    if (!n.todo.length) missing.push(`${where}: no todo (needs at least one acceptance criterion)`)
    if (!KINDS.includes(n.kind)) missing.push(`${where}: kind must be one of ${KINDS.join("|")}`)
    if (n.io.in == null && n.io.out == null) missing.push(`${where}: io not declared (needs io.in and/or io.out)`)
    for (const k of n.envKeys) if (!/^[A-Z][A-Z0-9_]*$/.test(k)) missing.push(`${where}: env key "${k}" is not UPPER_SNAKE`)
    if (n.tools.length && !n.envKeys.length) warnings.push(`${where}: has tools (${n.tools.join(", ")}) but declares no envKeys — confirm none need a secret`)
    // Ontology gates (schema v2): a work node must say WHICH actions flow through it, and only
    // declared ids; referenced state must exist; errorPolicy must be a known value.
    if (n.actions !== "all") {
      if (!n.actions.length) missing.push(`${where}: declare which actions flow through it — actions: [ids] or "all"${ontologyHint}`)
      for (const aId of n.actions) if (!actionIds.has(aId)) missing.push(`${where}: actions references unknown action "${aId}"`)
    }
    for (const sId of n.state) if (!stateIds.has(sId)) missing.push(`${where}: state references unknown state "${sId}" (declare it in the graph's state[] registry)`)
    if (n.errorPolicy && !ERROR_POLICIES.includes(n.errorPolicy)) missing.push(`${where}: errorPolicy must be one of ${ERROR_POLICIES.join("|")}`)
  }
  // Action-level gates (the canon's teeth): every declared action has ≥1 DEDICATED node (an explicit
  // membership, trunk "all" nodes don't count — an action with only trunk coverage has no branch);
  // a router exists whenever any action declares hooks; hookless actions are flagged (unreachable
  // by voice); a named condition must be non-empty text (normalizer already trims).
  for (const a of graph.actions) {
    if (!a.description) missing.push(`action "${a.id}": empty description (what outcome it produces)${ontologyHint}`)
    if (!a.channel) warnings.push(`action "${a.id}": no channel declared — where is its output delivered?`)
    const dedicated = graph.nodes.filter(n => Array.isArray(n.actions) && n.actions.includes(a.id))
    if (!dedicated.length) missing.push(`action "${a.id}": no dedicated node — every action needs ≥1 node whose actions[] names it explicitly (trunk "all" nodes are shared, not a branch)${ontologyHint}`)
    if (!a.hooks.length) warnings.push(`action "${a.id}": no hooks — unreachable by voice; confirm another trigger drives it`)
  }
  if (graph.actions.some(a => a.hooks.length) && !graph.nodes.some(n => n.kind === "router")) {
    missing.push(`graph: actions declare hooks but no router node exists (kind: "router" — the classifier that turns an event into an action id)${ontologyHint}`)
  }
  for (const s of graph.state) {
    if (!graph.nodes.some(n => n.state.includes(s.id))) warnings.push(`state "${s.id}" is declared but no node references it`)
  }
  for (const s of README_SECTIONS) if (!graph.project[s]) missing.push(`project readme: missing "${s}" section`)
  // Records columns gate (ontology entity 12): when a record block is present it must declare a
  // valid table, ≥1 field, each field a closed type + an id-safe source, and ≥1 defaultVisible.
  // A broken column config would generate an unrenderable table — refuse it (the canon has teeth).
  if (graph.record) {
    const rec = graph.record
    if (!rec.table) missing.push(`record: table must be a valid identifier (the DB table the rows come from)${ontologyHint}`)
    if (!rec.fields.length) missing.push(`record: declares a records table but no fields[] (columns)${ontologyHint}`)
    for (const f of rec.fields) {
      const w = `record field "${f.id || "?"}"`
      if (!f.header) missing.push(`${w}: missing header`)
      if (!COLUMN_TYPES.includes(f.type)) missing.push(`${w}: type must be one of ${COLUMN_TYPES.join("|")}${ontologyHint}`)
      if (!f.source) missing.push(`${w}: source must be a valid column identifier of "${rec.table}"`)
    }
    if (rec.fields.length && !rec.fields.some(f => f.defaultVisible)) missing.push(`record: at least one field must be defaultVisible${ontologyHint}`)
  }
  return { ok: missing.length === 0, missing, ...(warnings.length ? { warnings } : {}) }
}

// ── 4. ORDER SHEET ───────────────────────────────────────────────────────────
// Stable approve token over the normalized graph (no volatile state for projects). The SAME plan keeps
// the SAME token across sessions — the bond that (in D1.2) makes cold resume after a death possible.
function orderSheetId(graph) {
  const canon = {
    category: graph.category, slug: graph.slug, project: graph.project,
    actions: graph.actions, state: graph.state,
    ...(graph.record ? { record: graph.record } : {}),
    nodes: graph.nodes.map(n => ({ id: n.id, title: n.title, kind: n.kind, actions: n.actions, condition: n.condition, errorPolicy: n.errorPolicy, state: n.state, description: n.description, task: n.task, tools: n.tools, envKeys: n.envKeys, io: n.io, todo: n.todo, dependsOn: n.dependsOn })),
  }
  return "os-" + createHash("sha256").update(JSON.stringify(canon)).digest("hex").slice(0, 16)
}
const nodeActionsLabel = n => (n.actions === "all" ? "all" : n.actions.join(", "))
// One resolved human line per node — rendered HERE from normalized values, never worded by the model.
function renderNodeLine(seq, n) {
  const parts = [
    `${seq}. ${n.title} [${n.kind}]`,
    n.task ? `task: ${n.task.length > 80 ? n.task.slice(0, 77) + "…" : n.task}` : "task: (empty)",
  ]
  parts.push(`actions: ${nodeActionsLabel(n)}`)
  if (n.condition) parts.push(`condition: ${n.condition}`)
  if (n.tools.length) parts.push(`tools: ${n.tools.join(", ")}`)
  if (n.envKeys.length) parts.push(`keys: ${n.envKeys.join(", ")}`)
  parts.push(`io: ${JSON.stringify(n.io.in)}→${JSON.stringify(n.io.out)}`)
  if (n.dependsOn.length) parts.push(`depends: ${n.dependsOn.join(", ")}`)
  return parts.join(" · ")
}
// One resolved human line per ACTION — the order sheet shows the automation's outcomes first.
function renderActionLine(a) {
  const parts = [`• ${a.title} [${a.id}] (${a.color})`, a.description]
  if (a.hooks.length) parts.push(`hooks: ${a.hooks.map(h => `"${h.phrase}"`).join(", ")}`)
  if (a.condition) parts.push(`condition: ${a.condition}`)
  if (a.channel) parts.push(`channel: ${a.channel}`)
  return parts.filter(Boolean).join(" · ")
}

// ── 5. MATERIALIZE (D1.2) — development-step file lifecycle for project nodes ──
// Same on-disk format as the content engine (fractera:step machine block) so the /service/
// development-steps page renders these too — but a DIFFERENT payload: each file is a rich per-node
// SPEC a coder opens later (§4.2), never an execute-then-deploy sub-step. No deploy, no record, no
// auto-close — the engine PLANS the queue; a coding agent develops and closes each node in D3.
async function nextStepNumber(outRoot) {
  let max = 0
  for (const d of [NEW_DIR, DONE_DIR]) {
    let names = []; try { names = await readdir(join(outRoot, STEP_ROOT, d)) } catch { /* none */ }
    for (const n of names) { const m = n.match(/^(\d+)-/); if (m) max = Math.max(max, Number(m[1])) }
  }
  return max + 1
}
// The rich per-node spec file (§4.2 — ×5 richer than the content engine's renderStep). The FIRST body
// instruction is to read the project readme (owner requirement, step 184). `plan` carries the whole node
// so a COLD session rebuilds the queue from the files alone (resume) — the machine block is the source.
function renderNodeStep(number, node, ctx, status = "new", completedAt = null) {
  const toolLines = node.tools.length ? node.tools.map(t => `- ${t}`) : ["_No external tools._"]
  const keyLines = node.envKeys.length
    ? [...node.envKeys.map(k => `- \`${k}\``), "_Materialize each via the `persist-env-var-with-rebuild` skill — never hardcode a secret._"]
    : ["_No environment keys._"]
  const depLines = node.dependsOn.length ? node.dependsOn.map(d => `- \`${d}\` (must be completed first)`) : ["_No dependencies (root node)._"]
  const todoLines = node.todo.length ? node.todo.map(t => `- [ ] ${t}`) : ["- [ ] _No acceptance criteria — spec is incomplete._"]
  const body = [
    `# ${pad(number)} — ${node.title}`, "",
    `> Project sub-step · node \`${node.id}\` · kind: ${node.kind} · actions: ${nodeActionsLabel(node)} · importance: mandatory · order sheet \`${ctx.sheet}\` (${ctx.seq}/${ctx.total})` + (status === "completed" && completedAt ? ` · completed ${completedAt}` : "") + (status === "in-progress" ? " · in progress" : ""), "",
    `**Before anything else, read \`${ctx.readmeRel}\`** — the project overview (why / how it works / efficiency / reuse / result). Then read this whole spec before writing any code. The automation-ontology glossary (\`CRUD-DOCS/workspace-standards/automation-ontology.md\`) defines every entity this spec uses.`, "",
    r6Line(node, ctx), "",
    `## Actions this node serves`,
    node.actions === "all"
      ? "_Trunk node — every action of the automation flows through it._"
      : node.actions.map(a => `- \`${a}\``).join("\n"),
    ...(node.condition ? ["", "## Condition (declared guard)", `> ${node.condition}`, "", "_Implement this guard in the step body — the schema declares it, the code enforces it (R6)._"] : []), "",
    "## Task", node.task || "_No task._", "",
    "## Tools", ...toolLines, "",
    "## Environment keys", ...keyLines, "",
    "## Inputs / outputs", `- **In:** ${JSON.stringify(node.io.in)}`, `- **Out:** ${JSON.stringify(node.io.out)}`, "",
    "## Depends on", ...depLines, "",
    "## To-do / acceptance criteria", ...todoLines, "",
  ].join("\n")
  const machine = {
    number, name: node.title, importance: "mandatory", status, completedAt,
    description: node.description,
    tasks: node.todo.map(t => ({ body: t })),
    plan: { sheet: ctx.sheet, seq: ctx.seq, total: ctx.total, kind: "project-node", category: ctx.category, slug: ctx.slug, readmeRel: ctx.readmeRel, node: { id: node.id, title: node.title, kind: node.kind, actions: node.actions, condition: node.condition, errorPolicy: node.errorPolicy, state: node.state, task: node.task, description: node.description, tools: node.tools, envKeys: node.envKeys, io: node.io, dependsOn: node.dependsOn, todo: node.todo } },
  }
  return `${body}\n<!-- fractera:step\n${JSON.stringify(machine)}\n-->\n`
}
async function openNodeStep(outRoot, number, node, ctx) {
  const rel = `${NEW_DIR}/${pad(number)}-${node.id || "node"}.md`
  const abs = join(outRoot, STEP_ROOT, rel)
  await mkdir(dirname(abs), { recursive: true })
  await writeFile(abs, renderNodeStep(number, node, ctx), "utf8")
  return { rel, abs }
}
// Find every step file (both dirs) for ONE order sheet — the persisted queue (resume, 172). A node
// yields up to TWO files that share its topo `seq` — the spec (`project-node`) and the coder handoff
// (`coder-handoff`) — so the resume key is COMPOSITE `<kind>:<seq>`, never seq alone (they'd collide).
async function scanPlanSteps(outRoot, sheetId) {
  const found = new Map()
  for (const [d, done] of [[NEW_DIR, false], [DONE_DIR, true]]) {
    let names = []; try { names = await readdir(join(outRoot, STEP_ROOT, d)) } catch { continue }
    for (const name of names) {
      if (!name.endsWith(".md")) continue
      try {
        const m = (await readFile(join(outRoot, STEP_ROOT, d, name), "utf8")).match(/<!-- fractera:step\n([\s\S]*?)\n-->/)
        const st = m && JSON.parse(m[1])
        if (!st || st.plan?.sheet !== sheetId) continue
        found.set(`${st.plan.kind}:${st.plan.seq}`, { rel: `${d}/${name}`, abs: join(outRoot, STEP_ROOT, d, name), step: st, done })
      } catch { /* skip unreadable */ }
    }
  }
  return found
}

// ── 6. CODER HANDOFF (§4.3) — "calling the coder is its own step" ──────────────
// The owner's rule (step 184 §4): any delegation to a coding agent is a SEPARATE materialized step with
// EXHAUSTIVE requirements. The orchestrator (Hermes, or any planning agent) does not program — it hands a
// coder ONLY this step number, and everything they need is right here + in the spec step it points to.
// So this file must stand on its own: the fixed opening actions, the deliverable, the node-at-a-glance
// context (kind / tools / keys / depends / io), the offline-documentation reminder, the acceptance
// criteria, and the finish protocol (deploy → record → close). It mirrors the SOUL delegation edge and
// the delegate-task / prepare-automation-knowledge skills (D3). D1.3 shipped the skeleton; D3 deepens it.
function renderCoderHandoff(number, node, ctx, status = "new", completedAt = null) {
  const toolLine = node.tools.length ? `${node.tools.join(", ")} — search for a ready skill / MCP connector before building one` : "none"
  const keyLine = node.envKeys.length
    ? `${node.envKeys.map(k => `\`${k}\``).join(", ")} — materialize EACH via the \`persist-env-var-with-rebuild\` skill (write to the slot \`app/.env.local\` → rebuild); never hardcode a secret`
    : "none"
  const depLine = node.dependsOn.length ? `${node.dependsOn.map(d => `\`${d}\``).join(", ")} — those sub-steps must be closed first` : "none — this is a root node"
  const body = [
    `# ${pad(number)} — Call a coding agent: ${node.title}`, "",
    `> Coder handoff · node \`${node.id}\` · kind: ${node.kind} · order sheet \`${ctx.sheet}\` (${ctx.seq}/${ctx.total}) · spec step ${pad(ctx.specStep)}` + (status === "completed" && completedAt ? ` · completed ${completedAt}` : "") + (status === "in-progress" ? " · in progress" : ""), "",
    "I am the orchestrator; I do not program. Hand a coding agent (Claude Code / Codex / Gemini / Qwen / Kimi) ONLY this step number — everything they need is here and in the spec step it points to. This step IS the delegation record.", "",
    "## The coder's first actions, in order",
    `1. Read \`${ctx.readmeRel}\` — the whole project overview (why / how it works / efficiency / reuse / result).`,
    `2. Open step ${pad(ctx.specStep)} (\`${ctx.specRel}\`) — the exhaustive spec for node \`${node.id}\` (task, inputs/outputs, to-do).`,
    "3. Obey your own workspace instructions (`CLAUDE.md` / `AGENTS.md`): the static-first canon, `.client`/`.server` naming, ≤200-line components, and the full development pipeline (open → build → verify → deploy → record → close).", "",
    `**Deliver:** ${node.title}${node.description ? " — " + node.description : ""}`, "",
    r6Line(node, ctx), "",
    "## Node at a glance",
    `- **Kind:** ${node.kind}`,
    `- **Actions served:** ${nodeActionsLabel(node)} (the ontology's Action entity — see \`CRUD-DOCS/workspace-standards/automation-ontology.md\`)`,
    ...(node.condition ? [`- **Condition (declared guard):** ${node.condition} — implement it in the step body`] : []),
    ...(node.errorPolicy ? [`- **Error policy:** ${node.errorPolicy}`] : []),
    `- **Tools / integrations:** ${toolLine}`,
    `- **Environment keys:** ${keyLine}`,
    `- **Depends on:** ${depLine}`,
    `- **Inputs → outputs:** ${JSON.stringify(node.io.in)} → ${JSON.stringify(node.io.out)}`, "",
    "## Documentation is already on disk (assume no internet)",
    "Any external reference this node needs is transferred to `CRUD-DOCS/external/…` and Company Memory before this handoff (the `prepare-automation-knowledge` doc-transfer). Read the local files or query Company Memory — do not assume internet access. If a needed document is missing, say so in the step; never guess an API.", "",
    "## Acceptance criteria",
    ...(node.todo.length ? node.todo.map(t => `- [ ] ${t}`) : ["- [ ] (see the spec step)"]),
    `_(Full detail, inputs/outputs and to-do live in spec step ${pad(ctx.specStep)}.)_`, "",
    "## When done",
    `Deploy, then record the deployment (platform, model, tokens, page URL), and close BOTH this handoff step and spec step ${pad(ctx.specStep)} into \`COMPLETED-STEPS/\`.`, "",
    "The orchestrator relays only the number — do not wait for more context in chat; it is all here and in the spec step.", "",
  ].join("\n")
  const machine = {
    number, name: `Call a coding agent: ${node.title}`, importance: "mandatory", status, completedAt,
    description: `Delegate node ${node.id} to a coding agent (read readme + spec step ${pad(ctx.specStep)}).`,
    tasks: node.todo.map(t => ({ body: t })),
    plan: { sheet: ctx.sheet, seq: ctx.seq, total: ctx.total, kind: "coder-handoff", category: ctx.category, slug: ctx.slug, readmeRel: ctx.readmeRel, nodeId: node.id, specStep: ctx.specStep, specSeq: ctx.specSeq,
      node: { id: node.id, title: node.title, kind: node.kind, actions: node.actions, condition: node.condition, errorPolicy: node.errorPolicy, tools: node.tools, envKeys: node.envKeys, io: node.io, dependsOn: node.dependsOn, todo: node.todo } },
  }
  return `${body}\n<!-- fractera:step\n${JSON.stringify(machine)}\n-->\n`
}
async function openHandoffStep(outRoot, number, node, ctx) {
  const rel = `${NEW_DIR}/${pad(number)}-coder-handoff-${node.id || "node"}.md`
  const abs = join(outRoot, STEP_ROOT, rel)
  await mkdir(dirname(abs), { recursive: true })
  await writeFile(abs, renderCoderHandoff(number, node, ctx), "utf8")
  return { rel, abs }
}

// ── 7. PROJECT README (D2, §4.1) — the project-root overview, GENERATED from the graph ────────
// Develops the static README.md.tpl (step 178) into a document BORN from the decomposition, not a stub:
// why the project exists, HOW IT WORKS (an auto-table of the node graph in topological order), how it
// wins efficiency, how to reuse it, the end result — plus a fractera:project machine block (the whole
// graph, the source for validation & cold resume). Every coder reads THIS first at the start of every
// sub-step (every spec/handoff step file points here). A lean WORKING doc for the model, never design-lore
// (memory emitted-artifacts-lean-no-narrative): no marketing manifesto. Casing README.md preserved (178).
function renderProjectReadme(graph, ordered, ctx) {
  const p = graph.project
  const title = p.title || humanize(graph.slug) || "Project"
  const rows = ordered.map((n, i) => {
    const acts = n.actions === "all" ? "all" : n.actions.map(a => `\`${a}\``).join(", ")
    const tools = n.tools.length ? clip(n.tools.join(", "), 40) : "—"
    const keys = n.envKeys.length ? n.envKeys.map(k => `\`${k}\``).join(", ") : "—"
    const deps = n.dependsOn.length ? n.dependsOn.map(d => `\`${d}\``).join(", ") : "—"
    return `| ${i + 1} | \`${n.id}\` | ${n.kind} | ${acts} | ${clip(n.task, 70)} | ${tools} | ${keys} | ${deps} |`
  })
  // The Actions section (ontology entity 5) — outcomes first: what the automation DOES, each with
  // its hooks, condition, channel and the chain of dedicated steps (its branch).
  const actionRows = graph.actions.map(a => {
    const hooks = a.hooks.length ? a.hooks.map(h => `"${mdCell(h.phrase)}"`).join(", ") : "—"
    const chain = ordered.filter(n => Array.isArray(n.actions) && n.actions.includes(a.id)).map(n => `\`${n.id}\``).join(" → ") || "—"
    return `| \`${a.id}\` | ${mdCell(a.title)} | ${a.color} | ${hooks} | ${a.condition ? mdCell(a.condition) : "—"} | ${a.channel ? mdCell(a.channel) : "—"} | ${chain} |`
  })
  const stateRows = graph.state.map(s => `| \`${s.id}\` | ${mdCell(s.storage)} | ${mdCell(s.purpose)} |`)
  const body = [
    `# ${title}`, "",
    `> Project overview · category \`${graph.category}\` · slug \`${graph.slug}\` · ${graph.actions.length} action(s) · ${ordered.length} node(s) · order sheet \`${ctx.sheet}\``, "",
    "**Read this first at the start of EVERY sub-step** — it is generated from the decomposition graph and is the single source of truth for what this project is and how its nodes fit together. Entity definitions: `CRUD-DOCS/workspace-standards/automation-ontology.md` (the automation-ontology glossary).", "",
    "## Why", p.purpose, "",
    ...(graph.actions.length ? [
      "## Actions (what this automation does)",
      "An Action is a named outcome — a branch of steps triggered by its hook phrases (or another trigger). Configuring the automation = configuring these actions:", "",
      "| action | title | color | hooks | condition | channel | step chain |",
      "|---|---|---|---|---|---|---|",
      ...actionRows, "",
    ] : []),
    "## How it works",
    "The project is decomposed into nodes; each node is a sub-step a coding agent builds later. Nodes run in the topological order below (a node runs after everything it depends on); the `actions` column says which action branches flow through each node (`all` = trunk):", "",
    `**Execution schema (contract R6):** the process diagram (\`${projectFlowRel(graph.category, graph.slug)}\`), the actions registry (\`${projectActionsRel(graph.category, graph.slug)}\`) and the durable workflow (\`${projectWorkflowRel(graph.category, graph.slug)}\`) are GENERATED from this graph and are the project's ONLY execution schema — what is not on the diagram does not exist in the project. A coder implements only step bodies (under the \`// node:<id>\` markers); a new Action = extend the graph and re-run the engine, never a shadow step outside the schema.`, "",
    "| # | node | kind | actions | task | tools | keys | depends on |",
    "|---|---|---|---|---|---|---|---|",
    ...rows, "",
    ...(graph.state.length ? [
      "## State (persistent between runs)",
      "| state | storage | purpose |",
      "|---|---|---|",
      ...stateRows, "",
    ] : []),
    "## Efficiency", p.efficiency, "",
    "## Reuse", p.reuse, "",
    "## Result", p.result, "",
  ].join("\n")
  const machine = {
    kind: "project", sheet: ctx.sheet, category: graph.category, slug: graph.slug, title,
    project: p,
    actions: graph.actions,
    state: graph.state,
    nodes: ordered.map(n => ({ id: n.id, title: n.title, kind: n.kind, actions: n.actions, condition: n.condition, errorPolicy: n.errorPolicy, state: n.state, description: n.description, task: n.task, tools: n.tools, envKeys: n.envKeys, io: n.io, dependsOn: n.dependsOn, todo: n.todo })),
    order: ordered.map(n => n.id),
  }
  return `${body}\n<!-- fractera:project\n${JSON.stringify(machine)}\n-->\n`
}
// Write (or refresh) the project-root README. It is DERIVED from the approved graph, so a real run — even a
// cold resume — rewrites it deterministically (same graph → identical bytes). mkdir -p handles the fresh
// project folder (decomposition runs before the project-page primitive is composed).
async function writeProjectReadme(outRoot, graph, ordered, ctx) {
  const abs = join(outRoot, ctx.readmeRel)
  await mkdir(dirname(abs), { recursive: true })
  await writeFile(abs, renderProjectReadme(graph, ordered, ctx), "utf8")
  return { rel: ctx.readmeRel, abs }
}

// ── 8. EXECUTION SCHEMA (D6, contract R6) — diagram + workflow GENERATED from the graph ──────
// The owner's MAIN INVARIANT (184-hermes-projects-mode-contract §R6): the WDK schema is the ONLY
// schema of execution — what is not on the diagram does not exist in the project ("a wrong schema
// = a broken project"). So the engine derives BOTH sides from the SAME approved graph:
//   • _data/flow.ts        — the diagram as data (react-flow nodes/edges + the R8 info payload).
//     DERIVED like the README: always rewritten deterministically (marker `// fractera:flow`).
//   • _workflow/definition.ts — the durable WDK workflow: one "use step" per NON-trigger node in
//     topological order, each under a `// node:<id>` marker; runProject chains them through an
//     artifacts accumulator. Written ONLY when absent or still the composed starter placeholder
//     (`fractera:starter-workflow`) — NEVER over a coder's implemented steps. When kept, the file
//     is VALIDATED for isomorphism (every non-trigger node has its marker; no extra markers) and
//     the mismatch is reported as a warning — the coder reconciles, the engine never deletes code.
// Trigger nodes are not steps — they ARE the run route / cron queue that fires the workflow.
const flat = s => String(s ?? "").replace(/\s*\n+\s*/g, " ").trim()
const projectFlowRel = (category, slug) => `app/(projects)/projects/${category}/${slug}/_data/flow.ts`
const projectActionsRel = (category, slug) => `app/(projects)/projects/${category}/${slug}/_data/actions.ts`
const projectColumnsRel = (category, slug) => `app/(projects)/projects/${category}/${slug}/_data/columns.ts`
const projectWorkflowRel = (category, slug) => `app/api/projects/${category}/${slug}/_workflow/definition.ts`
const STARTER_WORKFLOW_MARKER = "fractera:starter-workflow"

// The shared R6 sentence every spec / handoff / README carries — the coder must know the schema is
// generated and where their ONLY writable surface is (the body of their node's step).
function r6Line(node, ctx) {
  const own = node.kind === "trigger"
    ? "this node is a TRIGGER — it IS the run route / cron queue that fires the workflow, it has no workflow step"
    : `implement ONLY the body of this node's step (under the \`// node:${node.id}\` marker in the workflow)`
  return `**Execution schema (contract R6):** the process diagram (\`${projectFlowRel(ctx.category, ctx.slug)}\`) and the durable workflow (\`${projectWorkflowRel(ctx.category, ctx.slug)}\`) are GENERATED from the decomposition graph and are the project's ONLY execution schema — what is not on the diagram does not exist in the project; ${own}; a new action = extend the GRAPH and re-run the engine, never a shadow step outside the schema.`
}

// Layered DAG layout for the diagram: depth = longest dependency chain (topo order guarantees deps
// are placed first), x = depth * 260, y = index-within-layer * 100 — same grid the frozen template uses.
function layoutPositions(ordered) {
  const depth = new Map(), layerCount = new Map(), pos = new Map()
  for (const n of ordered) {
    const d = n.dependsOn.length ? Math.max(...n.dependsOn.map(dep => depth.get(dep) ?? 0)) + 1 : 0
    depth.set(n.id, d)
    const i = layerCount.get(d) ?? 0
    layerCount.set(d, i + 1)
    pos.set(n.id, { x: d * 260, y: i * 100 })
  }
  return pos
}
// The diagram-as-data file — self-contained (same types the frozen flow.ts.tpl ships, so the
// process-flow client renders it unchanged) with FLOW_NODES/FLOW_EDGES derived from the graph.
// The R8 info payload (summary/processes/kind/task/tools/envKeys/io) comes straight from the node.
function renderProjectFlow(ordered, ctx) {
  const pos = layoutPositions(ordered)
  const triggers = new Set(ordered.filter(n => n.kind === "trigger").map(n => n.id))
  const nodes = ordered.map(n => ({
    id: n.id, type: "process", position: pos.get(n.id),
    data: { label: n.title, info: { summary: n.description, processes: n.todo, kind: n.kind, actions: n.actions === "all" ? "all" : n.actions, condition: n.condition, task: n.task, tools: n.tools, envKeys: n.envKeys, io: { in: n.io.in, out: n.io.out } } },
  }))
  const edges = []
  for (const n of ordered) for (const dep of n.dependsOn) edges.push({ id: `e-${dep}-${n.id}`, source: dep, target: n.id, ...(triggers.has(dep) ? { animated: true } : {}) })
  return [
    `import type { Edge, Node } from "@xyflow/react";`, "",
    `// fractera:flow ${ctx.sheet} — GENERATED by orchestrate-project-by-steps from the`,
    "// decomposition graph (step 184, contract R6; ontology step 188-R). This diagram is",
    "// the project's EXECUTION SCHEMA: what is not on it does not exist in the project.",
    "// The file is DERIVED — a re-run rewrites it deterministically, so NEVER hand-edit",
    "// it: to change the diagram, extend the graph and re-run the engine. Each node's",
    "// `info` is the payload of the on-canvas info panel (R8); `info.actions` names the",
    "// Action branches flowing through the node (\"all\" = trunk) and drives the node's",
    "// color via the actions registry (_data/actions.ts).",
    "export type FlowNodeInfo = {",
    "  summary: string;",
    "  processes: string[];",
    `  kind: "trigger" | "router" | "step" | "transform" | "action";`,
    `  actions?: string[] | "all";`,
    "  condition?: string | null;",
    "  task?: string;",
    "  tools: string[];",
    "  envKeys: string[];",
    "  io?: { in: unknown; out: unknown };",
    "};", "",
    "export type FlowNodeData = {",
    "  label: string;",
    "  info: FlowNodeInfo;",
    "};", "",
    `export type FlowNode = Node<FlowNodeData, "process">;`, "",
    `export const FLOW_NODES: FlowNode[] = ${JSON.stringify(nodes, null, 2)};`, "",
    `export const FLOW_EDGES: Edge[] = ${JSON.stringify(edges, null, 2)};`, "",
  ].join("\n")
}
async function writeProjectFlow(outRoot, ordered, ctx) {
  const rel = projectFlowRel(ctx.category, ctx.slug)
  const abs = join(outRoot, rel)
  await mkdir(dirname(abs), { recursive: true })
  await writeFile(abs, renderProjectFlow(ordered, ctx), "utf8")
  return { rel, abs }
}

// The ACTIONS REGISTRY as data (ontology entity 5) — the single client-side source for action
// titles/colors/hooks/conditions/channels. DERIVED like flow.ts (always rewritten). The hooks
// panel derives its suggestions from PROJECT_ACTIONS[].hooks; the records table and the diagram
// read titles/colors from here — no surface hardcodes an action ever again.
function renderProjectActions(graph, ctx) {
  const entries = graph.actions.map(a => ({
    id: a.id, title: a.title, description: a.description, color: a.color,
    hooks: a.hooks, condition: a.condition, channel: a.channel,
  }))
  return [
    `// fractera:actions ${ctx.sheet} — GENERATED by orchestrate-project-by-steps from the`,
    "// decomposition graph (automation ontology, step 188-R). An Action is a named outcome",
    "// of this automation — a branch of steps triggered by its hook phrases. This registry",
    "// is DERIVED (a re-run rewrites it): to add or change an action, extend the graph and",
    "// re-run the engine. Canon: CRUD-DOCS/workspace-standards/automation-ontology.md.",
    "export type ProjectActionHook = { phrase: string; lang: string };",
    "export type ProjectAction = {",
    "  id: string;",
    "  title: string;",
    "  description: string;",
    "  color: string; // palette token — the UI maps it to theme-aware classes",
    "  hooks: ProjectActionHook[];",
    "  condition: string | null; // declared guard — implemented in the workflow step (R6)",
    "  channel: string; // where this action's output is delivered",
    "};", "",
    `export const PROJECT_ACTIONS: ProjectAction[] = ${JSON.stringify(entries, null, 2)};`, "",
    "// Lookup helper — unknown ids resolve to a neutral placeholder (never undefined).",
    "export function projectAction(id: string): ProjectAction {",
    "  return (",
    "    PROJECT_ACTIONS.find((a) => a.id === id) ?? {",
    `      id, title: id, description: "", color: "neutral", hooks: [], condition: null, channel: "",`,
    "    }",
    "  );",
    "}",
  ].join("\n")
}
async function writeProjectActions(outRoot, graph, ctx) {
  const rel = projectActionsRel(ctx.category, ctx.slug)
  const abs = join(outRoot, rel)
  await mkdir(dirname(abs), { recursive: true })
  await writeFile(abs, renderProjectActions(graph, ctx), "utf8")
  return { rel, abs }
}

// The COLUMNS REGISTRY as data (ontology entity 12 Record) — the config that drives the ONE
// universal RecordsTable. DERIVED like actions.ts (always rewritten from graph.record.fields[]).
// RECORD_TABLE is the DB source; each column is {id,header,type,source,defaultVisible,attr?,options?}
// with type in the CLOSED renderer set. No automation hand-codes a bespoke table ever again.
function renderProjectColumns(graph, ctx) {
  const rec = graph.record || {}
  const table = rec.table || ""
  const entries = (rec.fields || []).map(f => ({
    id: f.id, header: f.header, type: f.type, source: f.source,
    defaultVisible: f.defaultVisible !== false,
    ...(f.attr ? { attr: f.attr } : {}),
    ...(f.options ? { options: f.options } : {}),
  }))
  return [
    `// fractera:columns ${ctx.sheet} — GENERATED by orchestrate-project-by-steps from the graph's`,
    "// record.fields[] (automation ontology entity 12 Record, step 188-R). The universal RecordsTable",
    "// renders whatever this declares through a CLOSED set of typed renderers; a re-run rewrites this",
    "// file — to add or change a column, extend the GRAPH and re-run, never edit a component.",
    "// Canon: CRUD-DOCS/workspace-standards/automation-ontology.md.",
    "",
    `export type ColumnType = "badge" | "text" | "longtext" | "date" | "link" | "actions";`,
    "export type ColumnOptions = {",
    "  colorFrom?: string;",
    "  emphasizeIfFuture?: boolean;",
    "  expand?: boolean;",
    `  action?: "detail" | "delete";`,
    "};",
    "export type ProjectColumn = {",
    "  id: string;",
    "  header: string;",
    "  type: ColumnType;",
    "  source: string;",
    "  defaultVisible: boolean;",
    "  attr?: string;",
    "  options?: ColumnOptions;",
    "};",
    "",
    "// The DB table rows come from. Empty string = the generic completed-runs results.",
    `export const RECORD_TABLE = ${JSON.stringify(table)};`,
    "",
    `export const PROJECT_COLUMNS: ProjectColumn[] = ${JSON.stringify(entries, null, 2)};`,
    "",
    "export function defaultVisibleColumnIds(): string[] {",
    "  return PROJECT_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id);",
    "}",
    "export function projectColumn(id: string): ProjectColumn | undefined {",
    "  return PROJECT_COLUMNS.find((c) => c.id === id);",
    "}",
  ].join("\n")
}
async function writeProjectColumns(outRoot, graph, ctx) {
  const rel = projectColumnsRel(ctx.category, ctx.slug)
  const abs = join(outRoot, rel)
  await mkdir(dirname(abs), { recursive: true })
  await writeFile(abs, renderProjectColumns(graph, ctx), "utf8")
  return { rel, abs }
}

// One valid TS identifier per step function, camelCase from the node id; reserved names and
// collisions get a numeric suffix so the generated file always compiles.
const RESERVED_STEP_NAMES = new Set(["runProject", "openRun", "closeRun"])
function stepFnName(id, used) {
  let base = String(id).split(/[^a-z0-9]+/i).filter(Boolean).map((w, i) => i ? w[0].toUpperCase() + w.slice(1) : w).join("") || "node"
  if (/^[0-9]/.test(base)) base = "n" + base
  let name = base, i = 2
  while (RESERVED_STEP_NAMES.has(name) || used.has(name)) { name = base + i; i++ }
  used.add(name)
  return name
}
// The durable-workflow skeleton — the EXECUTABLE mirror of the diagram. Journal open/close steps
// are kept verbatim from the frozen template's contract (same project_cron_runs journal the page
// tables read); the diagram-mirror steps are TODO bodies the coder fills per their handoff step.
function renderWorkflowDefinition(ordered, ctx) {
  const workNodes = ordered.filter(n => n.kind !== "trigger")
  const triggerNodes = ordered.filter(n => n.kind === "trigger")
  const used = new Set()
  const names = new Map(workNodes.map(n => [n.id, stepFnName(n.id, used)]))
  const calls = workNodes.map(n => `    artifacts[${JSON.stringify(n.id)}] = await ${names.get(n.id)}(artifacts);`)
  const stepFns = workNodes.map(n => [
    `// node:${n.id} — ${flat(n.title)} [${n.kind}] · actions: ${nodeActionsLabel(n)}`,
    `async function ${names.get(n.id)}(artifacts: Record<string, unknown>): Promise<unknown> {`,
    `  "use step";`, "",
    `  // TODO (diagram node "${n.id}"): ${flat(n.task)}`,
    ...(n.condition ? [`  // Condition (declared guard — implement it here): ${flat(n.condition)}`] : []),
    `  // In: ${JSON.stringify(n.io.in)} → Out: ${JSON.stringify(n.io.out)}`,
    ...n.todo.map(t => `  // - [ ] ${flat(t)}`),
    "  void artifacts;",
    "  return null;",
    "}",
  ].join("\n"))
  return [
    `import { journalRunStart, journalRunFinish } from "./journal";`, "",
    `// fractera:workflow ${ctx.sheet} — GENERATED by orchestrate-project-by-steps from the`,
    "// decomposition graph (step 184, contract R6). This workflow is the EXECUTABLE",
    "// mirror of the diagram in the project page's _data/flow.ts — the two are",
    "// ISOMORPHIC: one \"use step\" function per non-trigger diagram node, in",
    "// topological order, each under its `// node:<id>` marker. Implement ONLY the",
    "// step BODIES (keep the markers and signatures); a new action = extend the GRAPH",
    "// and re-run the engine — a shadow step outside the diagram is forbidden (what",
    "// is not on the diagram does not exist in the project). Journal open/close are",
    "// engine plumbing — keep them as steps (checkpointed ids never double-insert).",
    ...(triggerNodes.length ? [
      "//",
      "// Trigger node(s) of the diagram — not steps; the run route (../run/route.ts)",
      "// and the project's cron queue fire this workflow:",
      ...triggerNodes.map(n => `//   • "${n.id}" — ${flat(n.title)}`),
    ] : []), "",
    "export async function runProject(input?: string) {",
    `  "use workflow";`, "",
    "  const journalId = await openRun(input);",
    "  const artifacts: Record<string, unknown> = { input };",
    "  try {",
    ...calls,
    "    // TODO: pass the final artifact's resultTitle/resultUrl once the last step is implemented.",
    "    await closeRun(journalId, { ok: true });",
    `    return { journalId, status: "completed" };`,
    "  } catch (e) {",
    "    await closeRun(journalId, {",
    "      ok: false,",
    "      error: e instanceof Error ? e.message : String(e),",
    "    });",
    "    throw e;",
    "  }",
    "}", "",
    "// Journal steps — write the run into project_cron_runs, the same table the",
    "// queue/results tables of the project page read. Keep them as steps: the id is",
    "// checkpointed, so a replay never double-inserts.", "",
    "async function openRun(input?: string) {",
    `  "use step";`, "",
    "  const id = crypto.randomUUID();",
    "  journalRunStart(id, input);",
    "  return id;",
    "}", "",
    "async function closeRun(",
    "  id: string,",
    "  result: { ok: boolean; resultTitle?: string; resultUrl?: string; error?: string },",
    ") {",
    `  "use step";`, "",
    "  journalRunFinish(id, result);",
    "}", "",
    "// ── Diagram-mirror steps (one per non-trigger node, topological order) ──", "",
    stepFns.join("\n\n"), "",
  ].join("\n")
}
// Kept-file isomorphism check (R6): every non-trigger node must have its `// node:<id>` marker in
// the coder's file; a marker with no graph node is `extra`. A mismatch is a WARNING, not a blocker
// — the engine never rewrites a coder's implemented workflow.
function validateWorkflowIso(src, ordered) {
  const wanted = ordered.filter(n => n.kind !== "trigger").map(n => n.id)
  const found = [...new Set([...src.matchAll(/\/\/\s*node:([a-z0-9-]+)/g)].map(m => m[1]))]
  const missing = wanted.filter(id => !found.includes(id))
  const extra = found.filter(id => !wanted.includes(id))
  return { ok: !missing.length && !extra.length, missing, extra }
}
async function emitWorkflowDefinition(outRoot, ordered, ctx) {
  const rel = projectWorkflowRel(ctx.category, ctx.slug)
  const abs = join(outRoot, rel)
  let existing = null
  try { existing = await readFile(abs, "utf8") } catch { /* absent — generate */ }
  if (existing !== null && !existing.includes(STARTER_WORKFLOW_MARKER)) {
    return { rel, action: "kept", iso: validateWorkflowIso(existing, ordered) }
  }
  await mkdir(dirname(abs), { recursive: true })
  await writeFile(abs, renderWorkflowDefinition(ordered, ctx), "utf8")
  return { rel, action: "generated" }
}

// Order-sheet human protocol (§8): the model relays these VERBATIM — it never words the confirmation
// or the announcement itself (the weak-model lesson: recite ≠ execute).
function announceText(lang) {
  return lang === "ru"
    ? "Ухожу в разработку проекта — сначала разложу его на под-шаги и материализую очередь, затем узлы разрабатывает кодер. Активность в этом чате будет скрыта; следите за прогрессом на /service/development-steps и /service/architecture."
    : "I'm going into project development — first I decompose it into sub-steps and materialize the queue, then a coding agent builds each node. Activity in this chat will be hidden; watch progress on /service/development-steps and /service/architecture."
}
function confirmInstruction(lang, token, mvp) {
  const base = lang === "ru"
    ? `Покажи владельцу строки наряд-заказа ДОСЛОВНО (по одной на узел + план readme). Правки → измени граф и повтори --dry-run (id сменится). При явном «да» — вызови БЕЗ --dry-run с --approve ${token} и ПЕРЕДАЙ владельцу announce_text дословно.`
    : `Show the owner the order-sheet lines VERBATIM (one per node + the readme plan). Edits → change the graph and re-run --dry-run (the id changes). On an explicit "yes" — call WITHOUT --dry-run with --approve ${token} and RELAY announce_text to the owner verbatim.`
  if (!mvp) return base
  return base + (lang === "ru"
    ? " СНАЧАЛА передай владельцу mvp_recommendation ДОСЛОВНО — граф больше 10 узлов."
    : " FIRST relay mvp_recommendation to the owner VERBATIM — the graph exceeds 10 nodes.")
}
// R7 (owner contract 184): >10 nodes → recommend an MVP cut. A SOFT gate — the decision stays with the
// owner (progressive understanding: they should always know exactly how the project works).
function mvpRecommendation(lang, count) {
  return lang === "ru"
    ? `В графе ${count} узлов (больше 10). Рекомендация: запустить MVP не более чем из 10 узлов, а расширение функциональности каждого узла оформлять отдельными будущими задачами — так вы на каждом этапе точно понимаете, как работает проект. Решение за вами: можно продолжить и с полным графом.`
    : `The graph has ${count} nodes (more than 10). Recommendation: launch an MVP of at most 10 nodes and extend each node's functionality as separate future tasks — that way you always understand exactly how the project works. The decision is yours: you may proceed with the full graph.`
}

async function main() {
  const a = parseArgs(process.argv.slice(2))
  const outRoot = resolve(a.out || "")
  if (!a.out) throw new Error("--out (slot root) is required")

  let planText = typeof a.plan === "string" ? a.plan : ""
  if (a["plan-file"]) planText = await readFile(resolve(a["plan-file"]), "utf8")
  if (!planText.trim()) throw new Error("provide --plan '<graph JSON>' or --plan-file <path.json>")
  let raw
  try { raw = JSON.parse(planText) } catch (e) { throw new Error("--plan must be valid JSON: " + e.message) }

  const graph = normalizeGraph(raw, a.category, a.slug)
  const dag = validateDag(graph.nodes)
  const spec = validateSpec(graph)
  const sheetId = orderSheetId(graph)

  // DAG failure is structural — report before anything else (a malformed graph cannot be planned).
  if (!dag.ok) {
    console.log(JSON.stringify({ ok: false, gate: "dag", category: graph.category, slug: graph.slug, errors: dag.errors,
      note: "graph topology is invalid — fix dependsOn / cycles, then re-run" }))
    return
  }
  // SPEC GATE — fires in dry-run AND a real run (design §5). No materialization while incomplete.
  if (!spec.ok) {
    console.log(JSON.stringify({ ok: false, needs_spec: true, category: graph.category, slug: graph.slug, missing: spec.missing, ...(spec.warnings ? { warnings: spec.warnings } : {}),
      instruction: "Each node must be a complete spec (task, description, ≥1 todo, io, well-formed envKeys) and the project readme plan must carry purpose/efficiency/reuse/result. Fill the missing items and re-run.",
      order_sheet_id: sheetId }))
    return
  }

  // Ordered plan (topological) — the queue D1.2 will materialize as NEW-STEPS spec files.
  const byId = new Map(graph.nodes.map(n => [n.id, n]))
  const ordered = dag.order.map((id, i) => { const n = byId.get(id); return { seq: i + 1, id: n.id, title: n.title, kind: n.kind, dependsOn: n.dependsOn } })
  const orderedNodes = dag.order.map(id => byId.get(id)) // full nodes in topo order — for the README table
  // The coder-facing project-root README (D2 writes it, §4.1) — the frozen project-page mount; each step points here.
  const readmeRel = projectReadmeRel(graph.category, graph.slug)
  const ownerLang = a["owner-lang"] === "ru" ? "ru" : "en"
  const sheet = {
    id: sheetId,
    category: graph.category,
    slug: graph.slug,
    readme_plan: { ...graph.project },
    readme_path: readmeRel,
    ...(graph.actions.length ? { actions: graph.actions.map(a => ({ id: a.id, text: renderActionLine(a) })) } : {}),
    ...(graph.state.length ? { state: graph.state.map(s => ({ id: s.id, text: `• state ${s.id} · ${s.storage} · ${s.purpose}` })) } : {}),
    nodes: dag.order.map((id, i) => ({ n: i + 1, id, text: renderNodeLine(i + 1, byId.get(id)) })),
    ...(dag.order.length > 10 ? { mvp_recommendation: mvpRecommendation(ownerLang, dag.order.length) } : {}),
    announce_text: announceText(ownerLang),
    confirm_instruction: confirmInstruction(ownerLang, sheetId, dag.order.length > 10),
  }

  // Resume detection (172): step files for THIS order sheet already on disk = a prior run of the SAME
  // approved plan. The files ARE the queue — existing ones are skipped, only missing seq are (re)written.
  const prior = await scanPlanSteps(outRoot, sheetId)

  // DRY-RUN — the full decomposition plan, nothing written.
  const slotSeen = await exists(outRoot)
  if (a["dry-run"]) {
    console.log(JSON.stringify({ ok: true, dryRun: true, mode: "project-plan", category: graph.category, slug: graph.slug,
      actions: graph.actions.length, nodes: graph.nodes.length, ...(graph.duplicates ? { deduped: graph.duplicates } : {}), ...(spec.warnings ? { warnings: spec.warnings } : {}),
      order_sheet: sheet, plan: ordered, out_exists: slotSeen, readme_path: readmeRel,
      flow_path: projectFlowRel(graph.category, graph.slug), actions_path: projectActionsRel(graph.category, graph.slug), workflow_path: projectWorkflowRel(graph.category, graph.slug),
      ...(prior.size ? { resume_available: prior.size, resume_note: "step files for this order sheet already exist — a real run RESUMES (existing sub-steps kept, only missing ones written)" } : {}),
      note: `MATERIALIZE (real run): the project-root README (${readmeRel}) generated from the graph + the execution schema (R6: diagram ${projectFlowRel(graph.category, graph.slug)} + actions registry ${projectActionsRel(graph.category, graph.slug)} always rewritten; workflow ${projectWorkflowRel(graph.category, graph.slug)} only when absent/starter) + one NEW-STEPS spec file per node + one coder-handoff step per coder-built node (materialize-first) before any development.` }))
    return
  }

  // 🔒 APPROVE TOKEN — a materializing run writes real files, so it REQUIRES the token of the exact
  // order sheet the owner saw (issued only by dry-run). A changed/unshown plan cannot start. (The full
  // human-facing confirm/announce protocol + coder-handoff steps complete in D1.3.)
  if (a.approve !== sheetId) {
    console.log(JSON.stringify({ ok: false, gate: "approve",
      expected_flow: "call with --dry-run first → show the returned order_sheet lines to the owner verbatim → owner says yes → call again with --approve <order_sheet.id>",
      detail: a.approve ? "approve token mismatch (the plan changed since it was confirmed — re-run dry-run, re-show, re-confirm)" : "missing approve token (the order sheet was never confirmed)" }))
    return
  }

  // MATERIALIZE-FIRST (172): persist the WHOLE queue on disk BEFORE any development. First the project-root
  // README generated from the graph (§4.1, D2) — the overview every sub-step reads — then each node yields
  // (a) a rich per-node SPEC step and (b) — when the node is coder-built — a CODER-HANDOFF step that points
  // at that spec's number (§4.3). The README is derived, so a cold resume rewrites it deterministically;
  // the step files are keyed by composite <kind>:<seq> so a re-run skips whatever is already on disk.
  const readmeFile = await writeProjectReadme(outRoot, graph, orderedNodes, { sheet: sheetId, category: graph.category, slug: graph.slug, readmeRel })
  // EXECUTION SCHEMA (D6, R6): both sides derived from the SAME approved graph. The diagram file is
  // derived like the README (always rewritten); the workflow skeleton never overwrites a coder's code.
  const emitCtx = { sheet: sheetId, category: graph.category, slug: graph.slug }
  const flowFile = await writeProjectFlow(outRoot, orderedNodes, emitCtx)
  const actionsFile = graph.actions.length ? await writeProjectActions(outRoot, graph, emitCtx) : null
  const columnsFile = graph.record ? await writeProjectColumns(outRoot, graph, emitCtx) : null
  const workflow = await emitWorkflowDefinition(outRoot, orderedNodes, emitCtx)
  const materialized = [], skipped = []
  let n = await nextStepNumber(outRoot)
  for (let i = 0; i < ordered.length; i++) {
    const seq = i + 1, node = byId.get(ordered[i].id)
    const baseCtx = { sheet: sheetId, seq, total: ordered.length, category: graph.category, slug: graph.slug, readmeRel }
    // (a) the per-node spec step — the coder opens this to build the node
    let specStep, specRel
    const exSpec = prior.get(`project-node:${seq}`)
    if (exSpec) {
      specStep = exSpec.step.number; specRel = exSpec.rel
      skipped.push({ seq, id: node.id, kind: "project-node", rel: exSpec.rel, status: exSpec.done ? "completed" : "pending" })
    } else {
      const opened = await openNodeStep(outRoot, n, node, baseCtx)
      specStep = n; specRel = opened.rel
      materialized.push({ seq, step: n, id: node.id, kind: "project-node", rel: opened.rel }); n++
    }
    // (b) the coder-handoff step — separate materialized step, references the spec by number (§4.3)
    if (node.needsCoder) {
      const exHand = prior.get(`coder-handoff:${seq}`)
      if (exHand) {
        skipped.push({ seq, id: node.id, kind: "coder-handoff", rel: exHand.rel, status: exHand.done ? "completed" : "pending" })
      } else {
        const opened = await openHandoffStep(outRoot, n, node, { ...baseCtx, specStep, specSeq: seq, specRel })
        materialized.push({ seq, step: n, id: node.id, kind: "coder-handoff", rel: opened.rel }); n++
      }
    }
  }
  const specCount = materialized.filter(m => m.kind === "project-node").length
  const handCount = materialized.filter(m => m.kind === "coder-handoff").length
  console.log(JSON.stringify({ ok: true, mode: "project-plan", ...(prior.size ? { resumed: true } : {}), category: graph.category, slug: graph.slug,
    order_sheet_id: sheetId, actions: graph.actions.length, nodes: graph.nodes.length, readme_path: readmeRel, readme: readmeFile.rel,
    flow: flowFile.rel, ...(actionsFile ? { actions_registry: actionsFile.rel } : {}),
    ...(columnsFile ? { columns_registry: columnsFile.rel } : {}),
    workflow: { rel: workflow.rel, action: workflow.action, ...(workflow.iso ? { iso: workflow.iso } : {}) },
    ...(workflow.iso && !workflow.iso.ok ? { warnings: [...(spec.warnings ?? []), `workflow ${workflow.rel} is NOT isomorphic to the diagram (missing markers: ${workflow.iso.missing.join(", ") || "none"}; extra markers: ${workflow.iso.extra.join(", ") || "none"}) — a coder must reconcile it with the graph (R6)`] } : (spec.warnings ? { warnings: spec.warnings } : {})),
    materialized, ...(skipped.length ? { skipped } : {}),
    note: `Wrote the project-root README (${readmeFile.rel}) from the graph + the execution schema (R6): diagram ${flowFile.rel}${actionsFile ? ` + actions registry ${actionsFile.rel}` : ""} (derived, always rewritten) + workflow ${workflow.rel} (${workflow.action}) + materialized ${specCount} node spec file(s) + ${handCount} coder-handoff step(s) in ${STEP_ROOT}/${NEW_DIR}${skipped.length ? `, skipped ${skipped.length} already on disk` : ""}. Each step file's first instruction is to read that README. A coder develops & closes each node later (D3).` }))
}

main().catch(e => { console.error("orchestrate-project-by-steps:", e.message); process.exit(1) })
