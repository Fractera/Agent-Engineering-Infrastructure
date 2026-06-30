#!/usr/bin/env node
// manage-content-collections — deterministic content CRUD over co-located collections.
//
// ONE executor for the 6 file-system operations (scenario #1 of 8). The agent supplies
// DATA (a structured JSON content object — that is NOT programming); this emitter writes
// the FILES, by construction, with ZERO code generation. Any model => identical result.
//
//   create group  -> DELEGATES to compose-frozen-template.mjs (do not reimplement; step 147)
//   delete group  -> remove app/[lang]/<tab>/ + drop its COLLECTIONS line (parser-fs)
//   edit   group  -> rewrite the tab UI chrome _data/{en,<lang>}.ts from --ui JSON
//   create page   -> new app/[lang]/<tab>/<slug>/ : copy thin page.tsx/_components from a
//                    sibling post (slug-agnostic) + serialize _data/* from --data JSON
//   edit   page   -> rewrite the post _data/* from --data JSON (page.tsx/_components untouched)
//   delete page   -> remove app/[lang]/<tab>/<slug>/
// Every create/page-edit regenerates _list.generated.ts by scanning the tab (no parser-fs dep).
//
// INTEGRITY (the contract Hermes broke): folder===slug; language override within the slot's
// declared set (en + ru, never an unshipped lang); no foreign-script artifacts; `founder`
// block only LAST; required root anchor "Agentic Engineering Infrastructure"; HARD-GATE no
// unsubstituted {{TOKEN}} ships. ANTI-DESTRUCTIVE: create-group refuses an existing tab
// (ADD a page instead); edit/delete require the target to exist.
//
// Usage:
//   node manage-content-collections.mjs --out <slot-root> --op <create|edit|delete>
//     --target <group|page> --tab <tab> [--slug <slug>] [--data <file.json>] [--ui <file.json>]
//     [--store <frozen-templates-dir>] [--format news|blog|document] [--languages en,ru]
//     [--label-en .. --label-ru ..] [--dry-run] [--force]
//
// Self-sufficient: plain Node-ESM, writes only under --out, no Hermes, no MCP required.

import { mkdir, writeFile, readFile, readdir, stat, rm } from "node:fs/promises"
import { join, resolve, dirname, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const HERE = dirname(fileURLToPath(import.meta.url))

// ── args / fs helpers ────────────────────────────────────────────────────────
function parseArgs(argv) {
  const a = {}
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]
    if (!k.startsWith("--")) continue
    const key = k.slice(2), next = argv[i + 1]
    if (next === undefined || next.startsWith("--")) a[key] = true
    else { a[key] = next; i++ }
  }
  return a
}
const exists = async p => { try { await stat(p); return true } catch { return false } }
const isDir = async p => { try { return (await stat(p)).isDirectory() } catch { return false } }
function pascal(s) { return String(s).split(/[^a-z0-9]+/i).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join("") }
async function readJson(p) { return JSON.parse(await readFile(p, "utf8")) }

// The slot's OWN language authority (step 149/150). Author strictly within it; no env -> en only.
async function slotLanguages(outRoot) {
  for (const rel of [".env.local", "app/.env.local"]) {
    try {
      const m = (await readFile(join(outRoot, rel), "utf8")).match(/^\s*NEXT_PUBLIC_SUPPORTED_LANGUAGES\s*=\s*(.+?)\s*$/m)
      if (m) { const l = m[1].trim().replace(/^["']|["']$/g, "").split(",").map(s => s.trim()).filter(Boolean); if (l.length) return l }
    } catch { /* try next */ }
  }
  return ["en"]
}

// ── integrity validators (refuse before any write) ───────────────────────────
const errs = []
function fail(msg) { errs.push(msg) }
function flush(dryPlan) {
  if (errs.length) { console.log(JSON.stringify({ ok: false, refused: true, errors: errs }, null, 2)); process.exit(2) }
  if (dryPlan) { console.log(JSON.stringify({ ok: true, dryRun: true, plan: dryPlan }, null, 2)); process.exit(0) }
}
function validSlug(slug) {
  if (!slug || slug === true || !/^[a-z][a-z0-9-]*$/.test(slug)) { fail(`--slug must be kebab-case (folder===slug): got ${JSON.stringify(slug)}`); return false }
  return true
}
function checkLanguages(langs, allowed) {
  for (const l of langs) if (!allowed.includes(l)) fail(`language '${l}' is not in the slot's declared set [${allowed.join(",")}] — add it via App Settings (rebuild) BEFORE authoring (step 150). Never inject an unshipped language (e.g. 'es').`)
}
// Foreign-script artifacts (rule 4б): CJK / Arabic / Hebrew / Devanagari sneaking into en/ru text.
const FOREIGN = /[　-鿿؀-ۿ֐-׿ऀ-ॿ가-힯]/
// Broken/replacement characters (a lossy encoding step): U+FFFD/U+FFFC, C0/C1 control chars
// (except tab/LF/CR) — e.g. a control byte 0x13 left where an accented letter belonged, rendering a
// box — and UTF-8-read-as-Latin1 mojibake. Codepoint-based; refused in every authoring path.
function hasBrokenChar(str) {
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    if (c === 0xFFFD || c === 0xFFFC) return true
    if (c <= 0x08 || c === 0x0B || c === 0x0C || (c >= 0x0E && c <= 0x1F)) return true
    if (c >= 0x7F && c <= 0x9F) return true
    if ((c === 0xC3 || c === 0xC2) && i + 1 < str.length) { const n = str.charCodeAt(i + 1); if (n >= 0x80 && n <= 0xBF) return true }
  }
  return false
}
function scanForeign(label, text) {
  if (typeof text === "string") {
    if (FOREIGN.test(text)) fail(`foreign-script characters in ${label} (likely a model artifact, rule 4б): ${JSON.stringify(text.slice(0, 60))}`)
    if (hasBrokenChar(text)) fail(`broken/replacement character in ${label} (U+FFFD, a control byte, or mojibake — a lossy-encoding artifact; fix the source text): ${JSON.stringify(text.slice(0, 60))}`)
  }
  else if (Array.isArray(text)) text.forEach((v, i) => scanForeign(`${label}[${i}]`, v))
  else if (text && typeof text === "object") for (const [k, v] of Object.entries(text)) scanForeign(`${label}.${k}`, v)
}
function checkBlocks(label, blocks) {
  if (!Array.isArray(blocks)) return
  blocks.forEach((b, i) => {
    if (b && b.kind === "founder" && i !== blocks.length - 1) fail(`${label}: a 'founder' block must be the LAST block (brand sign-off), not at index ${i}`)
  })
}
// Required root anchor with the EXACT phrase, woven into some block text.
function checkRootAnchor(label, body) {
  const text = JSON.stringify(body || {})
  if (!/Agentic Engineering Infrastructure/.test(text)) fail(`${label}: missing the mandatory root anchor — weave a link with the EXACT anchor [Agentic Engineering Infrastructure](/<lang>) into the content`)
}

// ── TS serialization (DATA -> file) ──────────────────────────────────────────
// Render a plain JSON value as a TS object literal in the codebase style (single
// quotes, unquoted identifier keys, trailing commas, 2-space indent) so the emitted
// _data files pass eslint as well as tsc. Only plain data (no functions) is ever passed.
function tsLit(v, ind = 0) {
  const pad = "  ".repeat(ind), pad1 = "  ".repeat(ind + 1)
  if (typeof v === "string") return `'${v.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n")}'`
  if (typeof v === "number" || typeof v === "boolean" || v === null) return String(v)
  if (Array.isArray(v)) return v.length ? `[\n${v.map(x => pad1 + tsLit(x, ind + 1)).join(",\n")},\n${pad}]` : "[]"
  const keys = Object.keys(v)
  if (!keys.length) return "{}"
  return `{\n${keys.map(k => `${pad1}${/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : `'${k}'`}: ${tsLit(v[k], ind + 1)}`).join(",\n")},\n${pad}}`
}
const ts = v => JSON.stringify(v, null, 2) // for stdout JSON (dry-run plan) only
async function writeOut(outRoot, relDest, content, plan) {
  const dest = join(outRoot, relDest)
  if (!resolve(dest).startsWith(resolve(outRoot))) throw new Error(`refusing to write outside out: ${relDest}`)
  const leftover = content.match(/\{\{[A-Za-z0-9_]+\}\}/g)
  if (leftover) throw new Error(`unsubstituted token(s) ${[...new Set(leftover)].join(", ")} in ${relDest} — refusing to emit`)
  if (plan) { plan.write.push(relDest); return }
  await mkdir(dirname(dest), { recursive: true }); await writeFile(dest, content, "utf8"); console.log("emit", relDest)
}

// ── clone a frozen stub post (Phase 1: structure is TAKEN, never generated) ───
// A new page = a CLONE of a sibling stub (a `compose --samples` post that already has the
// vetted block structure). The model supplies only light metadata (slug + optional
// title/date/tags); the block structure + placeholder text come from the stub verbatim.
// Authoring real body content into the frozen slots is Phase 2 (step 155), not this tool.
async function walk(dir, base = dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, e.name)
    if (e.isDirectory()) await walk(full, base, out); else out.push(relative(base, full))
  }
  return out
}
function escTs(s) { return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, " ") }
// Replace a single-quoted scalar field value in known-shape frozen TS (e.g. slug:/title:/date:).
function replaceScalar(src, field, val) {
  const re = new RegExp(`(\\b${field}:\\s*)'[^']*'`)
  return re.test(src) ? src.replace(re, `$1'${escTs(val)}'`) : src
}
function replaceTags(src, tags) {
  const lit = `[${tags.map(t => `'${escTs(t)}'`).join(", ")}]`
  return src.replace(/(\btags:\s*)\[[^\]]*\]/, `$1${lit}`)
}
async function clonePost(outRoot, tabDir, sib, slug, data, plan) {
  const absSib = join(outRoot, tabDir, sib)
  for (const rel of await walk(absSib)) {
    const r = rel.replace(/\\/g, "/")
    let body = await readFile(join(absSib, rel), "utf8")
    if (r === "_data/meta.ts") {
      body = replaceScalar(body, "slug", slug)
      if (data.date) body = replaceScalar(body, "date", data.date)
      if (Array.isArray(data.tags)) body = replaceTags(body, data.tags)
    }
    if (data.title && (r === "_data/en.ts" || /^_data\/[a-z]{2}\.ts$/.test(r))) body = replaceScalar(body, "title", data.title)
    await writeOut(outRoot, join(tabDir, slug, r), body, plan)
  }
}

// Regenerate <tab>/_list.generated.ts by scanning the tab (no parser-fs dependency).
async function regenerateList(outRoot, tab, plan) {
  const tabDir = join(outRoot, "app", "[lang]", tab), P = pascal(tab)
  const slugs = []
  for (const e of await readdir(tabDir, { withFileTypes: true })) {
    if (!e.isDirectory() || /^[_[.]/.test(e.name)) continue
    if (await exists(join(tabDir, e.name, "_data", "index.ts"))) slugs.push(e.name)
  }
  slugs.sort()
  const body = `// AUTO-GENERATED (manage-content-collections) — regenerated by lib/parser-fs.mjs on build. DO NOT EDIT.\nimport type { ${P}Data } from './_lib/post'\n${slugs.map((s, i) => `import { data as p${i} } from './${s}/_data'`).join("\n")}\n\nexport const POSTS: ${P}Data[] = [${slugs.map((_, i) => `p${i}`).join(", ")}]\n`
  await writeOut(outRoot, join("app", "[lang]", tab, "_list.generated.ts"), body, plan)
}

async function firstSiblingPost(tabDir) {
  for (const e of await readdir(tabDir, { withFileTypes: true })) {
    if (e.isDirectory() && !/^[_[.]/.test(e.name) && await exists(join(tabDir, e.name, "_components", "index.tsx"))) return e.name
  }
  return null
}

// ── operations ───────────────────────────────────────────────────────────────
async function createGroup(outRoot, a) {
  const tabDir = join(outRoot, "app", "[lang]", a.tab)
  if (await isDir(tabDir)) fail(`group '${a.tab}' already exists — ADD a page (op=create target=page) or EDIT it, do NOT recreate (anti-destructive)`)
  if (!a.store) fail("--store (frozen-templates dir) is required to create a group")
  flush(null) // surfaces validation errors (exit 2) or continues to delegate
  const composer = join(HERE, "..", "compose-frozen-template", "compose-frozen-template.mjs")
  const pass = ["--store", a.store, "--out", outRoot, "--tab", a.tab, "--source", "files", "--depth", "1", "--rendering", "static"]
  for (const k of ["format", "languages", "samples", "roles", "label-en", "label-ru", "engine-version", "force"]) if (a[k] !== undefined) { pass.push(`--${k}`); if (a[k] !== true) pass.push(String(a[k])) }
  if (a["dry-run"]) { console.log(JSON.stringify({ ok: true, dryRun: true, delegate: "compose-frozen-template", args: pass }, null, 2)); return }
  const r = spawnSync(process.execPath, [composer, ...pass], { encoding: "utf8" })
  process.stdout.write(r.stdout || ""); if (r.stderr) process.stderr.write(r.stderr)
  if (r.status !== 0) process.exit(r.status || 1)
}

async function deleteGroup(outRoot, a, plan) {
  const tabDir = join("app", "[lang]", a.tab), abs = join(outRoot, tabDir)
  if (!(await isDir(abs))) { fail(`group '${a.tab}' does not exist — nothing to delete`); return }
  flush(null)
  // drop the COLLECTIONS line from parser-fs
  const pf = join(outRoot, "lib", "parser-fs.mjs")
  if (await exists(pf)) {
    const src = await readFile(pf, "utf8")
    const next = src.split("\n").filter(l => !l.includes(`app/[lang]/${a.tab}`)).join("\n")
    if (next !== src) { if (plan) plan.write.push("lib/parser-fs.mjs (drop COLLECTIONS line)"); else { await writeFile(pf, next, "utf8"); console.log("parser-fs: dropped", a.tab) } }
  }
  if (plan) { plan.remove.push(`${tabDir}/ (whole group)`); plan.note.push(`remove '/${a.tab}' from app/sitemap.ts (MANUAL — structure varies)`); return }
  await rm(abs, { recursive: true, force: true }); console.log("removed", tabDir)
  console.log(`note: remove '/${a.tab}' from app/sitemap.ts (MANUAL — structure varies)`)
}

async function editGroup(outRoot, a, langs, plan) {
  const tabDir = join("app", "[lang]", a.tab)
  if (!(await isDir(join(outRoot, tabDir)))) { fail(`group '${a.tab}' does not exist — create it first`); return }
  if (!a.ui) { fail("--ui <file.json> with the localized UI chrome is required for op=edit target=group"); return }
  const ui = await readJson(a.ui), P = pascal(a.tab)
  for (const [l, obj] of Object.entries(ui)) scanForeign(`ui.${l}`, obj)
  checkLanguages(Object.keys(ui), langs)
  flush(null)
  for (const [l, obj] of Object.entries(ui)) {
    const decl = l === "en" ? `export const en: ${P}Ui = ${tsLit(obj)}` : `export const ${l}: Partial<${P}Ui> = ${tsLit(obj)}`
    await writeOut(outRoot, join(tabDir, "_data", `${l}.ts`), `import type { ${P}Ui } from '../_lib/types'\n\n${decl}\n`, plan)
  }
}

// PHASE 1: a new page is a CLONE of a frozen stub. Structure is TAKEN, never generated by
// the model. The model passes only light metadata (slug + optional title/date/tags). Passing
// a BODY (blocks) is refused — that is Phase 2 (real content authoring, step 155).
async function createPage(outRoot, a, langs, plan) {
  const tabDir = join("app", "[lang]", a.tab), absTab = join(outRoot, tabDir)
  if (!(await isDir(absTab))) { fail(`group '${a.tab}' does not exist — create the group first (op=create target=group), or for stub posts use compose --samples N`); return }
  if (!validSlug(a.slug)) return
  if (await isDir(join(absTab, a.slug))) { fail(`page '${a.slug}' already exists in '${a.tab}' — EDIT it (op=edit) instead of recreating (anti-destructive)`); return }
  const data = a.data ? await readJson(a.data) : {}
  if (data.blocks || (data.en && data.en.blocks)) { fail(`authoring a page BODY (blocks) is Phase 2 — NOT this tool. A page here is a CLONE of the frozen stub: structure is taken, never generated. For test/placeholder posts use compose --samples N; real content authoring is step 155.`); return }
  if (data.title) scanForeign("title", data.title)
  if (Array.isArray(data.tags)) data.tags.forEach((t, i) => scanForeign(`tags[${i}]`, t))
  const sib = await firstSiblingPost(absTab)
  if (!sib) { fail(`'${a.tab}' has no stub post to clone — compose the group with at least one sample first`); return }
  flush(null)
  await clonePost(outRoot, tabDir, sib, a.slug, data, plan)
  await regenerateList(outRoot, a.tab, plan)
}

// PHASE 1: edit only METADATA (title/date/tags) on the existing frozen structure. Editing the
// BODY (blocks) is Phase 2 (step 155) and is refused here — the structure stays frozen.
async function editPage(outRoot, a, langs, plan) {
  const tabDir = join("app", "[lang]", a.tab)
  if (!validSlug(a.slug)) return
  if (!(await isDir(join(outRoot, tabDir, a.slug)))) { fail(`page '${a.slug}' does not exist in '${a.tab}'`); return }
  const data = a.data ? await readJson(a.data) : {}
  if (data.blocks || (data.en && data.en.blocks)) { fail(`editing a page BODY (blocks) is Phase 2 (step 155) — this tool edits only metadata (title/date/tags) on the frozen structure in Phase 1`); return }
  if (data.title) scanForeign("title", data.title)
  if (Array.isArray(data.tags)) data.tags.forEach((t, i) => scanForeign(`tags[${i}]`, t))
  if (!data.title && !data.date && !Array.isArray(data.tags)) { fail("nothing to edit — pass title and/or date and/or tags (body editing is step 155)"); return }
  flush(null)
  const metaPath = join(tabDir, a.slug, "_data", "meta.ts")
  let m = await readFile(join(outRoot, metaPath), "utf8")
  if (data.date) m = replaceScalar(m, "date", data.date)
  if (Array.isArray(data.tags)) m = replaceTags(m, data.tags)
  await writeOut(outRoot, metaPath, m, plan)
  if (data.title) {
    const enPath = join(tabDir, a.slug, "_data", "en.ts")
    await writeOut(outRoot, enPath, replaceScalar(await readFile(join(outRoot, enPath), "utf8"), "title", data.title), plan)
  }
}

async function deletePage(outRoot, a, plan) {
  const tabDir = join("app", "[lang]", a.tab)
  if (!validSlug(a.slug)) return
  const abs = join(outRoot, tabDir, a.slug)
  if (!(await isDir(abs))) { fail(`page '${a.slug}' does not exist in '${a.tab}'`); return }
  flush(null)
  if (plan) plan.remove.push(`${tabDir}/${a.slug}/`)
  else { await rm(abs, { recursive: true, force: true }); console.log("removed", join(tabDir, a.slug)) }
  await regenerateList(outRoot, a.tab, plan)
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  const a = parseArgs(process.argv.slice(2))
  const outRoot = resolve(a.out || "")
  if (!a.out) throw new Error("--out (slot root) is required")
  const op = a.op, target = a.target
  if (!["create", "edit", "delete"].includes(op)) throw new Error("--op must be create|edit|delete")
  if (!["group", "page"].includes(target)) throw new Error("--target must be group|page")
  if (!a.tab || a.tab === true || !/^[a-z][a-z0-9-]*$/.test(a.tab)) throw new Error("--tab is required, kebab-case")
  if ((a.backing || "fs") !== "fs") throw new Error("only backing=fs is implemented (db is the next of the 8 scenarios)")
  const langs = await slotLanguages(outRoot)
  const plan = a["dry-run"] ? { op, target, tab: a.tab, slug: a.slug, write: [], remove: [], note: [] } : null

  if (op === "create" && target === "group") return createGroup(outRoot, a) // delegates / handles its own dry-run
  if (op === "delete" && target === "group") await deleteGroup(outRoot, a, plan)
  else if (op === "edit" && target === "group") await editGroup(outRoot, a, langs, plan)
  else if (op === "create" && target === "page") await createPage(outRoot, a, langs, plan)
  else if (op === "edit" && target === "page") await editPage(outRoot, a, langs, plan)
  else if (op === "delete" && target === "page") await deletePage(outRoot, a, plan)

  flush(plan)
  console.log(`\n${op} ${target} '${a.tab}${a.slug ? "/" + a.slug : ""}' done. next: REBUILD the slot (Deploy) to see it; then \`npx tsc --noEmit\`; then record a Deployments row (owner_product_loop_record_deployment).`)
}

main().catch(e => { console.error("manage-content-collections:", e.message); process.exit(1) })
