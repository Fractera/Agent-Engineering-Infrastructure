#!/usr/bin/env node
// translate-content-page — the non-blocking translation RUNNER's executor. The agent (an LLM, no
// external API — subscription rule) translates the STRINGS; this emitter writes them into the frozen
// structure and clears the `needsTranslation` seed marker. It NEVER deploys — after a run the owner
// presses Deploy in the footer to publish.
//
// Two modes:
//   --op next  --lang <L> [--tab t --slug s]
//        Return the next page still needing translation for <L>: its current (default-language) _data
//        file as raw TS + the ordered list of block kinds + how many remain. The agent reads it,
//        translates the visible strings, and calls --op write with the SAME structure.
//   --op write --lang <L> --tab t --slug s --data <file.json>
//        Validate STRUCTURE PARITY (same block kinds in the same order, same faq length — only leaf
//        STRINGS may change, never the structure — the safe subset of step 155), serialize the payload
//        into _data/<L>.ts WITHOUT needsTranslation, and tick the page off in the translation step.
//
// Self-sufficient: plain Node-ESM, writes only under --out. Output: ONE line of JSON.

import { mkdir, writeFile, readFile, readdir, stat } from "node:fs/promises"
import { join, resolve, dirname } from "node:path"

function parseArgs(argv) {
  const a = {}
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]; if (!k.startsWith("--")) continue
    const key = k.slice(2), next = argv[i + 1]
    if (next === undefined || next.startsWith("--")) a[key] = true
    else { a[key] = next; i++ }
  }
  return a
}
const exists = async p => { try { await stat(p); return true } catch { return false } }
const isDir = async p => { try { return (await stat(p)).isDirectory() } catch { return false } }
const SKIP = name => /^[_.[]/.test(name)
const errs = []
const fail = m => errs.push(m)
function out(o) { process.stdout.write(JSON.stringify(o) + "\n") }
function finish(payload, exit = 0) {
  if (errs.length) { out({ ok: false, refused: true, errors: errs }); process.exit(2) }
  out({ ok: true, ...payload }); process.exit(exit)
}

// TS object-literal serializer (codebase style) — same contract as manage-content-collections.
function tsLit(v, ind = 0) {
  const pad = "  ".repeat(ind), pad1 = "  ".repeat(ind + 1)
  if (typeof v === "string") return `'${v.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n")}'`
  if (typeof v === "number" || typeof v === "boolean" || v === null) return String(v)
  if (Array.isArray(v)) return v.length ? `[\n${v.map(x => pad1 + tsLit(x, ind + 1)).join(",\n")},\n${pad}]` : "[]"
  const keys = Object.keys(v); if (!keys.length) return "{}"
  return `{\n${keys.map(k => `${pad1}${/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : `'${k}'`}: ${tsLit(v[k], ind + 1)}`).join(",\n")},\n${pad}}`
}
async function writeOut(outRoot, relDest, content) {
  const dest = join(outRoot, relDest)
  if (!resolve(dest).startsWith(resolve(outRoot))) throw new Error(`refusing to write outside out: ${relDest}`)
  await mkdir(dirname(dest), { recursive: true }); await writeFile(dest, content, "utf8")
}

// Broken-character validation (owner request). A lossy encoding step can leave a Unicode
// REPLACEMENT character (U+FFFD) or mojibake where an accented letter belonged — e.g. the live
// Spanish "Documentacion" (accented o) rendered as a box. Unlike a silently dropped letter these
// ARE detectable, so the translation pipeline refuses them rather than ship corruption. Detects:
// U+FFFD / U+FFFC, C0/C1 control chars (except tab/newline/CR), and UTF-8-read-as-Latin1 mojibake
// (a C3/C2 lead byte followed by a continuation byte). Codepoint-based — no literal bad chars here.
function hasBrokenChar(str) {
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    if (c === 0xFFFD || c === 0xFFFC) return true
    if (c <= 0x08 || c === 0x0B || c === 0x0C || (c >= 0x0E && c <= 0x1F)) return true
    if (c >= 0x7F && c <= 0x9F) return true
    if ((c === 0xC3 || c === 0xC2) && i + 1 < str.length) {
      const n = str.charCodeAt(i + 1); if (n >= 0x80 && n <= 0xBF) return true
    }
  }
  return false
}
function scanBroken(label, text, sink) {
  if (typeof text === "string") { if (hasBrokenChar(text)) sink(`broken/replacement character in ${label} (U+FFFD or mojibake — a lossy-encoding artifact; fix the source text): ${JSON.stringify(text.slice(0, 60))}`) }
  else if (Array.isArray(text)) text.forEach((v, i) => scanBroken(`${label}[${i}]`, v, sink))
  else if (text && typeof text === "object") for (const [k, v] of Object.entries(text)) scanBroken(`${label}.${k}`, v, sink)
}

const blockKindsOf = src => [...src.matchAll(/kind:\s*'(\w+)'/g)].map(m => m[1])
const faqCountOf = src => (src.match(/\bq:\s*'/g) || []).length
const overrideTypeOf = src => { const m = src.match(/export const \w+:\s*(\w+Override)\b/); return m ? m[1] : null }

// Find every page whose _data/<L>.ts is still a seed (needsTranslation: true).
async function pendingPages(outRoot, L) {
  const base = join(outRoot, "app", "[lang]")
  const pages = []
  if (!(await isDir(base))) return pages
  for (const tab of await readdir(base)) {
    const tabDir = join(base, tab)
    if (SKIP(tab) || !(await isDir(tabDir)) || !(await exists(join(tabDir, "_data", "group.ts")))) continue
    for (const slug of await readdir(tabDir)) {
      const f = join(tabDir, slug, "_data", `${L}.ts`)
      if (SKIP(slug) || !(await isDir(join(tabDir, slug)))) continue
      if (await exists(f) && /needsTranslation:\s*true/.test(await readFile(f, "utf8"))) pages.push({ tab, slug })
    }
  }
  return pages
}

async function opNext(outRoot, L, a) {
  const pages = await pendingPages(outRoot, L)
  if (!pages.length) return finish({ done: true, lang: L, remaining: 0, note: `No pages pending translation for '${L}'. Press Deploy in the footer to publish.` })
  const target = (a.tab && a.slug) ? { tab: String(a.tab), slug: String(a.slug) } : pages[0]
  const rel = join("app", "[lang]", target.tab, target.slug, "_data", `${L}.ts`)
  const src = await readFile(join(outRoot, rel), "utf8")
  return finish({
    mode: "next", lang: L, tab: target.tab, slug: target.slug, remaining: pages.length,
    blockKinds: blockKindsOf(src), faqCount: faqCountOf(src), sourceTs: src,
    instruction: `Translate every visible STRING in sourceTs into '${L}'. Keep the block kinds in the EXACT same order (${blockKindsOf(src).join(", ")}) and the same number of faq pairs. Keep the root-anchor link [Agentic Engineering Infrastructure](/${L}) and any /${L}/... links. Then call --op write with { fields:{title,seoTitle?,subtitle?,description?,summary?,keywords?}, blocks:[{kind,text|items}], faq:[{q,a}] }.`,
  })
}

async function opWrite(outRoot, L, a) {
  const tab = String(a.tab || ""), slug = String(a.slug || "")
  if (!tab || !slug) fail("--tab and --slug are required for op=write")
  const rel = join("app", "[lang]", tab, slug, "_data", `${L}.ts`)
  if (!(await exists(join(outRoot, rel)))) fail(`no seed _data/${L}.ts at ${tab}/${slug} — run the fan-out first`)
  if (errs.length) return finish({})
  const src = await readFile(join(outRoot, rel), "utf8")
  const typeName = overrideTypeOf(src) || "LocalizedBodyOverride"
  const expectedKinds = blockKindsOf(src), expectedFaq = faqCountOf(src)

  const data = JSON.parse(await readFile(a.data, "utf8"))
  const blocks = Array.isArray(data.blocks) ? data.blocks : []
  const gotKinds = blocks.map(b => b && b.kind)
  // STRUCTURE-PARITY GATE: only strings may change, never the structure (safe subset of step 155).
  if (gotKinds.length !== expectedKinds.length || gotKinds.some((k, i) => k !== expectedKinds[i]))
    fail(`structure parity violated: blocks must stay [${expectedKinds.join(", ")}] in that order, got [${gotKinds.join(", ")}]. Translate the STRINGS only; never add/remove/reorder blocks (that is authoring = step 155).`)
  const faq = Array.isArray(data.faq) ? data.faq : []
  if (expectedFaq && faq.length !== expectedFaq) fail(`faq must keep ${expectedFaq} pairs, got ${faq.length}`)
  const rootOk = JSON.stringify(blocks).includes(`(/${L})`)
  if (!rootOk) fail(`the root anchor link (/${L}) must be preserved in the translated body`)
  // BROKEN-CHARACTER GATE: refuse a translation carrying U+FFFD / mojibake / control chars.
  scanBroken("fields", data.fields, fail)
  scanBroken("blocks", blocks, fail)
  scanBroken("faq", faq, fail)
  if (errs.length) return finish({})

  // Build the override object (NO needsTranslation → page becomes indexable after the next Deploy).
  const fields = data.fields && typeof data.fields === "object" ? data.fields : {}
  const obj = {}
  for (const k of ["title", "seoTitle", "subtitle", "description", "summary", "keywords"]) if (fields[k] != null) obj[k] = String(fields[k])
  obj.blocks = blocks
  if (faq.length) obj.faq = faq
  const body = `import type { ${typeName} } from '../../_lib/types'\n\n// Translated to '${L}'. Strings only — the block structure stays frozen (set by the fan-out).\nexport const ${L}: ${typeName} = ${tsLit(obj)}\n`
  await writeOut(outRoot, rel, body)

  // Best-effort: tick this page off in the open translation step.
  await tickStep(outRoot, L, `/${L}/${tab}/${slug}`).catch(() => {})
  const remaining = (await pendingPages(outRoot, L)).length
  return finish({
    mode: "write", lang: L, tab, slug, written: rel, remaining,
    note: remaining ? `Translated. ${remaining} page(s) still pending for '${L}' — call --op next again.`
      : `Translated. ALL pages for '${L}' are done. Press Deploy in the footer to publish (the runner does NOT deploy).`,
  })
}

async function tickStep(outRoot, L, href) {
  const dir = join(outRoot, "DEVELOPMENT-STEPS", "NEW-STEPS")
  if (!(await isDir(dir))) return
  for (const f of await readdir(dir)) {
    if (!new RegExp(`-translate-${L}\\.md$`).test(f)) continue
    const p = join(dir, f); const s = await readFile(p, "utf8")
    const n = s.replace(new RegExp(`- \\[ \\] ${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), `- [x] ${href}`)
    if (n !== s) await writeFile(p, n, "utf8")
  }
}

async function main() {
  const a = parseArgs(process.argv.slice(2))
  const outRoot = resolve(a.out || "")
  if (!a.out) { out({ ok: false, errors: ["--out is required"] }); process.exit(1) }
  const L = String(a.lang || "").trim()
  if (!/^[a-z]{2}(-[A-Za-z0-9]+)?$/.test(L)) { out({ ok: false, errors: ["--lang BCP-47 required"] }); process.exit(1) }
  const op = String(a.op || "next")
  if (op === "next") return opNext(outRoot, L, a)
  if (op === "write") return opWrite(outRoot, L, a)
  out({ ok: false, errors: [`--op must be next|write, got ${op}`] }); process.exit(1)
}
main().catch(e => { out({ ok: false, errors: [`translate-content-page: ${e.message}`] }); process.exit(1) })
