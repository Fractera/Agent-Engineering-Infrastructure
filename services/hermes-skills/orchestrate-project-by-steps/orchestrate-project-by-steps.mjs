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
//                        node (§4.3) + the project-root README.md GENERATED from the graph (§4.1, D2).
//     6. RESUME        — stable token; a cold re-run skips finished sub-steps (composite key <kind>:<seq>)
//
// A real (materializing) run REQUIRES --approve <order_sheet.id> — the token issued by --dry-run for the
// exact plan the owner confirmed. --dry-run writes NOTHING. The SPEC GATE fires in both modes. This engine
// never deploys or executes a node — it PLANS / VALIDATES / DOCUMENTS / MATERIALIZES; a coder builds each
// node later in its own session (D3). D1.3 added the coder-handoff step + the human approve/announce protocol.
//
// Node contract (WDK-neutral seam — D6 fills `io` with the real Vercel Workflow schema, step 183):
//   node: { id, title, kind, description, task, tools[], envKeys[], io{in,out}, todo[], dependsOn[] }
//   kind ∈ "trigger" | "action" | "transform"  (WDK-compatible)
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

const KINDS = ["trigger", "action", "transform"]
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
    nodes.push({
      id,
      title: title || id,
      kind: KINDS.includes(str(n.kind).toLowerCase()) ? str(n.kind).toLowerCase() : "action",
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
  return {
    category: slugify(cliCategory ?? g.category) || "automation",
    slug: slugify(cliSlug ?? g.slug) || slugify(project.purpose) || "project",
    project,
    nodes,
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
  for (const n of graph.nodes) {
    const where = `node "${n.id}"`
    if (!n.task) missing.push(`${where}: empty task (needs the exhaustive sub-step spec)`)
    if (!n.description) missing.push(`${where}: empty description (needs a one-line summary)`)
    if (!n.todo.length) missing.push(`${where}: no todo (needs at least one acceptance criterion)`)
    if (!KINDS.includes(n.kind)) missing.push(`${where}: kind must be one of ${KINDS.join("|")}`)
    if (n.io.in == null && n.io.out == null) missing.push(`${where}: io not declared (needs io.in and/or io.out)`)
    for (const k of n.envKeys) if (!/^[A-Z][A-Z0-9_]*$/.test(k)) missing.push(`${where}: env key "${k}" is not UPPER_SNAKE`)
    if (n.tools.length && !n.envKeys.length) warnings.push(`${where}: has tools (${n.tools.join(", ")}) but declares no envKeys — confirm none need a secret`)
  }
  for (const s of README_SECTIONS) if (!graph.project[s]) missing.push(`project readme: missing "${s}" section`)
  return { ok: missing.length === 0, missing, ...(warnings.length ? { warnings } : {}) }
}

// ── 4. ORDER SHEET ───────────────────────────────────────────────────────────
// Stable approve token over the normalized graph (no volatile state for projects). The SAME plan keeps
// the SAME token across sessions — the bond that (in D1.2) makes cold resume after a death possible.
function orderSheetId(graph) {
  const canon = {
    category: graph.category, slug: graph.slug, project: graph.project,
    nodes: graph.nodes.map(n => ({ id: n.id, title: n.title, kind: n.kind, description: n.description, task: n.task, tools: n.tools, envKeys: n.envKeys, io: n.io, todo: n.todo, dependsOn: n.dependsOn })),
  }
  return "os-" + createHash("sha256").update(JSON.stringify(canon)).digest("hex").slice(0, 16)
}
// One resolved human line per node — rendered HERE from normalized values, never worded by the model.
function renderNodeLine(seq, n) {
  const parts = [
    `${seq}. ${n.title} [${n.kind}]`,
    n.task ? `task: ${n.task.length > 80 ? n.task.slice(0, 77) + "…" : n.task}` : "task: (empty)",
  ]
  if (n.tools.length) parts.push(`tools: ${n.tools.join(", ")}`)
  if (n.envKeys.length) parts.push(`keys: ${n.envKeys.join(", ")}`)
  parts.push(`io: ${JSON.stringify(n.io.in)}→${JSON.stringify(n.io.out)}`)
  if (n.dependsOn.length) parts.push(`depends: ${n.dependsOn.join(", ")}`)
  return parts.join(" · ")
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
    `> Project sub-step · node \`${node.id}\` · kind: ${node.kind} · importance: mandatory · order sheet \`${ctx.sheet}\` (${ctx.seq}/${ctx.total})` + (status === "completed" && completedAt ? ` · completed ${completedAt}` : "") + (status === "in-progress" ? " · in progress" : ""), "",
    `**Before anything else, read \`${ctx.readmeRel}\`** — the project overview (why / how it works / efficiency / reuse / result). Then read this whole spec before writing any code.`, "",
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
    plan: { sheet: ctx.sheet, seq: ctx.seq, total: ctx.total, kind: "project-node", category: ctx.category, slug: ctx.slug, readmeRel: ctx.readmeRel, node: { id: node.id, title: node.title, kind: node.kind, task: node.task, description: node.description, tools: node.tools, envKeys: node.envKeys, io: node.io, dependsOn: node.dependsOn, todo: node.todo } },
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
    "## Node at a glance",
    `- **Kind:** ${node.kind}`,
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
      node: { id: node.id, title: node.title, kind: node.kind, tools: node.tools, envKeys: node.envKeys, io: node.io, dependsOn: node.dependsOn, todo: node.todo } },
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
    const tools = n.tools.length ? clip(n.tools.join(", "), 40) : "—"
    const keys = n.envKeys.length ? n.envKeys.map(k => `\`${k}\``).join(", ") : "—"
    const deps = n.dependsOn.length ? n.dependsOn.map(d => `\`${d}\``).join(", ") : "—"
    return `| ${i + 1} | \`${n.id}\` | ${n.kind} | ${clip(n.task, 70)} | ${tools} | ${keys} | ${deps} |`
  })
  const body = [
    `# ${title}`, "",
    `> Project overview · category \`${graph.category}\` · slug \`${graph.slug}\` · ${ordered.length} node(s) · order sheet \`${ctx.sheet}\``, "",
    "**Read this first at the start of EVERY sub-step** — it is generated from the decomposition graph and is the single source of truth for what this project is and how its nodes fit together.", "",
    "## Why", p.purpose, "",
    "## How it works",
    "The project is decomposed into nodes; each node is a sub-step a coding agent builds later. Nodes run in the topological order below (a node runs after everything it depends on):", "",
    "| # | node | kind | task | tools | keys | depends on |",
    "|---|---|---|---|---|---|---|",
    ...rows, "",
    "## Efficiency", p.efficiency, "",
    "## Reuse", p.reuse, "",
    "## Result", p.result, "",
  ].join("\n")
  const machine = {
    kind: "project", sheet: ctx.sheet, category: graph.category, slug: graph.slug, title,
    project: p,
    nodes: ordered.map(n => ({ id: n.id, title: n.title, kind: n.kind, description: n.description, task: n.task, tools: n.tools, envKeys: n.envKeys, io: n.io, dependsOn: n.dependsOn, todo: n.todo })),
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
      nodes: graph.nodes.length, ...(graph.duplicates ? { deduped: graph.duplicates } : {}), ...(spec.warnings ? { warnings: spec.warnings } : {}),
      order_sheet: sheet, plan: ordered, out_exists: slotSeen, readme_path: readmeRel,
      ...(prior.size ? { resume_available: prior.size, resume_note: "step files for this order sheet already exist — a real run RESUMES (existing sub-steps kept, only missing ones written)" } : {}),
      note: `MATERIALIZE (real run): the project-root README (${readmeRel}) generated from the graph + one NEW-STEPS spec file per node + one coder-handoff step per coder-built node (materialize-first) before any development.` }))
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
    order_sheet_id: sheetId, nodes: graph.nodes.length, readme_path: readmeRel, readme: readmeFile.rel,
    materialized, ...(skipped.length ? { skipped } : {}), ...(spec.warnings ? { warnings: spec.warnings } : {}),
    note: `Wrote the project-root README (${readmeFile.rel}) from the graph + materialized ${specCount} node spec file(s) + ${handCount} coder-handoff step(s) in ${STEP_ROOT}/${NEW_DIR}${skipped.length ? `, skipped ${skipped.length} already on disk` : ""}. Each step file's first instruction is to read that README. A coder develops & closes each node later (D3).` }))
}

main().catch(e => { console.error("orchestrate-project-by-steps:", e.message); process.exit(1) })
