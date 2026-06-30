#!/usr/bin/env node
// fan-out-site-language — deterministically extend an EXISTING multilingual site to a NEW
// language across ALL co-located content (every group + every post), then open one dev-step
// per language so no translation is ever forgotten.
//
// THIS is the only sanctioned way to add a language to existing content. It is NOT a dumb copy:
//   1. seed each `_data/<L>.ts` with the DEFAULT language's content (so the site is valid the
//      instant the build finishes — no machine translation, no external API),
//   2. rewrite EVERY language-dependent link `/<defLang>` → `/<L>` (root anchor AND any internal
//      link) so a new-language page never points back at the default language,
//   3. mark the seed `needsTranslation: true` → the engine renders it but declares robots:noindex
//      (Doorway guard: Google must never index a cross-language duplicate); canonical/hreflang
//      stay correct (buildAlternates derives them from the lang set, step 153),
//   4. patch each `_data/index.ts` (post overrides + group UI map) and `group.ts` (languages)
//      idempotently, and retrofit old groups' `_lib/post.ts` mapper with the needsTranslation
//      passthrough,
//   5. write ONE open dev-step `DEVELOPMENT-STEPS/NEW-STEPS/<NN>-translate-<L>.md` listing every
//      page to translate (the translation runner fills the strings later, in its own step).
//
// PRECONDITION: <L> must already be in the slot's NEXT_PUBLIC_SUPPORTED_LANGUAGES (App Settings →
// rebuild) — otherwise the build bakes without it (steps 138/143). Refused here if not.
//
// Usage:
//   node fan-out-site-language.mjs --out <slot-root> --lang <bcp47> [--dry-run]
//
// Self-sufficient: plain Node-ESM, writes only under --out, no Hermes, no MCP required.
// Output: ONE line of JSON (the bridge parses the last line — step 158 lesson).

import { mkdir, writeFile, readFile, readdir, stat } from "node:fs/promises"
import { join, resolve, dirname, relative } from "node:path"

// ── args / fs helpers ────────────────────────────────────────────────────────
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
function pascal(s) { return String(s).split(/[^a-z0-9]+/i).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join("") }

const errs = []
function fail(msg) { errs.push(msg) }
function out(obj) { process.stdout.write(JSON.stringify(obj) + "\n") } // SINGLE LINE (bridge parses last line)
function done(plan, payload) {
  if (errs.length) { out({ ok: false, refused: true, errors: errs }); process.exit(2) }
  if (plan) { out({ ok: true, dryRun: true, ...payload, write: plan.write }); process.exit(0) }
  out({ ok: true, ...payload }); process.exit(0)
}

// Read a NEXT_PUBLIC_* value from the slot's .env.local (a plain file read — no API, step 150).
async function readEnv(outRoot, key) {
  for (const rel of [".env.local", "app/.env.local"]) {
    try {
      const m = (await readFile(join(outRoot, rel), "utf8")).match(new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`, "m"))
      if (m) return m[1].trim().replace(/^["']|["']$/g, "")
    } catch { /* try next */ }
  }
  return ""
}
async function slotLanguages(outRoot) {
  const v = await readEnv(outRoot, "NEXT_PUBLIC_SUPPORTED_LANGUAGES")
  const l = v.split(",").map(s => s.trim()).filter(Boolean)
  return l.length ? l : ["en"]
}
async function defaultLocale(outRoot, langs) {
  const v = (await readEnv(outRoot, "NEXT_PUBLIC_DEFAULT_LOCALE")).trim()
  return v && langs.includes(v) ? v : (langs[0] || "en")
}

async function writeOut(outRoot, relDest, content, plan) {
  const dest = join(outRoot, relDest)
  if (!resolve(dest).startsWith(resolve(outRoot))) throw new Error(`refusing to write outside out: ${relDest}`)
  const leftover = content.match(/\{\{[A-Za-z0-9_]+\}\}/g)
  if (leftover) throw new Error(`unsubstituted token(s) ${[...new Set(leftover)].join(", ")} in ${relDest} — refusing to emit`)
  if (plan) { plan.write.push(relDest); return }
  await mkdir(dirname(dest), { recursive: true }); await writeFile(dest, content, "utf8")
}

// Rewrite EVERY language-dependent markdown link from the source language to L:
//   [x](/es)   -> [x](/L)        [x](/es/foo) -> [x](/L/foo)
function rewriteLangLinks(src, fromLang, toL) {
  return src
    .replace(new RegExp(`\\]\\(/${fromLang}\\)`, "g"), `](/${toL})`)
    .replace(new RegExp(`\\]\\(/${fromLang}/`, "g"), `](/${toL}/`)
}

// ── discovery ────────────────────────────────────────────────────────────────
const SKIP = name => /^[_.[]/.test(name) // _components, _meta.ts, [lang] subdirs, dotfiles
async function listGroups(outRoot) {
  const base = join(outRoot, "app", "[lang]")
  if (!(await isDir(base))) return []
  const groups = []
  for (const e of await readdir(base, { withFileTypes: true })) {
    if (e.isDirectory() && !SKIP(e.name) && await exists(join(base, e.name, "_data", "group.ts"))) groups.push(e.name)
  }
  return groups.sort()
}
async function listPosts(outRoot, tab) {
  const base = join(outRoot, "app", "[lang]", tab)
  const posts = []
  for (const e of await readdir(base, { withFileTypes: true })) {
    if (e.isDirectory() && !SKIP(e.name) && await exists(join(base, e.name, "_data", "index.ts"))) posts.push(e.name)
  }
  return posts.sort()
}

// ── seed a per-language file from the default language's data ──────────────────
// Pick the source data file = the default language's effective content for this folder.
async function pickSource(absDataDir, def) {
  if (def !== "en" && await exists(join(absDataDir, `${def}.ts`))) return { file: `${def}.ts`, lang: def, isBase: false }
  return { file: "en.ts", lang: "en", isBase: true }
}

// Seed a POST override `_data/<L>.ts` from the default language (clone, rewrite links, mark seed).
async function seedPostOverride(outRoot, tab, slug, L, def, plan) {
  const relData = join("app", "[lang]", tab, slug, "_data")
  const absData = join(outRoot, relData)
  if (await exists(join(absData, `${L}.ts`))) return false // idempotent
  const { file, lang, isBase } = await pickSource(absData, def)
  let src = await readFile(join(absData, file), "utf8")
  // Base (en.ts) declares `<Tab>Base`; an override declares `<Tab>Override`. Convert the type+const.
  if (isBase) {
    src = src.replace(/import type \{\s*(\w+)Base\s*\}/, "import type { $1Override }")
    src = src.replace(/export const en:\s*(\w+)Base\b/, `export const ${L}: $1Override`)
  } else {
    src = src.replace(new RegExp(`export const ${lang}:`), `export const ${L}:`)
  }
  src = rewriteLangLinks(src, lang, L)
  // Inject the seed marker as the first field of the object literal.
  src = src.replace(/(export const \w+:\s*\w+(?:Override)?\s*=\s*\{)/, `$1\n  needsTranslation: true,`)
  await writeOut(outRoot, join(relData, `${L}.ts`), src, plan)
  return true
}

// Seed a GROUP UI partial `_data/<L>.ts` from the default language's labels (menus read it).
async function seedGroupUi(outRoot, tab, L, def, plan) {
  const relData = join("app", "[lang]", tab, "_data")
  const absData = join(outRoot, relData)
  if (await exists(join(absData, `${L}.ts`))) return false
  const { file, lang, isBase } = await pickSource(absData, def)
  let src = await readFile(join(absData, file), "utf8")
  if (isBase) {
    src = src.replace(/export const en:\s*(\w+)Ui\b/, `export const ${L}: Partial<$1Ui>`)
  } else {
    src = src.replace(new RegExp(`export const ${lang}:`), `export const ${L}:`)
  }
  src = rewriteLangLinks(src, lang, L)
  await writeOut(outRoot, join(relData, `${L}.ts`), src, plan)
  return true
}

// ── idempotent patchers ───────────────────────────────────────────────────────
async function patchPostIndex(outRoot, tab, slug, L, plan) {
  const rel = join("app", "[lang]", tab, slug, "_data", "index.ts")
  let src = await readFile(join(outRoot, rel), "utf8")
  if (new RegExp(`from './${L}'`).test(src)) return // idempotent
  src = src.replace(/(import \{ en \} from '\.\/en'\n)/, `$1import { ${L} } from './${L}'\n`)
  src = src.replace(/(overrides:\s*\{)([^}]*)(\})/, (m, a, inner, c) => {
    const items = inner.split(",").map(s => s.trim()).filter(Boolean)
    if (!items.includes(L)) items.push(L)
    return `${a} ${items.join(", ")} ${c}`
  })
  await writeOut(outRoot, rel, src, plan)
}

async function patchGroupIndex(outRoot, tab, L, plan) {
  const rel = join("app", "[lang]", tab, "_data", "index.ts")
  let src = await readFile(join(outRoot, rel), "utf8")
  if (new RegExp(`from './${L}'`).test(src)) return
  // add the lang import after the last `import { <x> } from './<x>'` line
  src = src.replace(/((?:import \{ \w+ \} from '\.\/\w+'\n)+)/, m => m + `import { ${L} } from './${L}'\n`)
  // add L to the UI map: const UI: Record<...> = { es } -> { es, L }
  src = src.replace(/(UI[^=]*=\s*\{)([^}]*)(\})/, (m, a, inner, c) => {
    const items = inner.split(",").map(s => s.trim()).filter(Boolean)
    if (!items.includes(L)) items.push(L)
    return `${a} ${items.join(", ")} ${c}`
  })
  await writeOut(outRoot, rel, src, plan)
}

async function patchGroupManifest(outRoot, tab, L, plan) {
  const rel = join("app", "[lang]", tab, "_data", "group.ts")
  let src = await readFile(join(outRoot, rel), "utf8")
  src = src.replace(/(languages:\s*)\[([^\]]*)\]/, (m, a, inner) => {
    const items = inner.split(",").map(s => s.trim()).filter(Boolean)
    const q = `"${L}"`, q2 = `'${L}'`
    if (items.includes(q) || items.includes(q2)) return m
    items.push(q)
    return `${a}[${items.join(", ")}]`
  })
  await writeOut(outRoot, rel, src, plan)
}

// Retrofit old groups' mapper so the resolved post carries needsTranslation (noindex guard).
async function patchPostMapper(outRoot, tab, plan) {
  const rel = join("app", "[lang]", tab, "_lib", "post.ts")
  if (!(await exists(join(outRoot, rel)))) return
  let src = await readFile(join(outRoot, rel), "utf8")
  if (/needsTranslation:\s*r\.needsTranslation/.test(src)) return // idempotent / fresh template
  if (!/inLanguage:\s*lang,/.test(src)) return // unknown shape — leave untouched
  src = src.replace(/(inLanguage:\s*lang,\n)/, `$1    needsTranslation: r.needsTranslation,\n`)
  await writeOut(outRoot, rel, src, plan)
}

// ── dev-step (Part B): one open translation step per language ──────────────────
async function writeTranslationStep(outRoot, L, pages, plan) {
  const dir = join("app", "DEVELOPMENT-STEPS", "NEW-STEPS")
  const absDir = join(outRoot, dir)
  await mkdir(absDir, { recursive: true }).catch(() => {})
  // next free 2-digit-ish number
  let max = 0
  try { for (const f of await readdir(absDir)) { const m = f.match(/^(\d+)-/); if (m) max = Math.max(max, +m[1]) } } catch { /* none */ }
  const nn = String(max + 1).padStart(2, "0")
  const rel = join(dir, `${nn}-translate-${L}.md`)
  const list = pages.map(p => `- [ ] ${p}`).join("\n")
  const body = `---
fractera:step:
  slug: translate-${L}
  importance: optional
  status: open
  kind: translation
  language: ${L}
---

# Translate all pages to '${L}'

This language was seeded with the default language's text and is currently \`noindex\` (Doorway guard).
Run the translation: the agent translates the STRINGS only, the block structure stays frozen; on write the
page clears \`needsTranslation\` and becomes indexable after the next manual Deploy.

Use the **translate-pending-pages** skill / \`owner_content_translate_pending\` MCP — do NOT hand-edit.
Optional: add notes below to focus the model (e.g. regional law, real legal links) — they are honored on run.

## Pages to translate
${list}
`
  await writeOut(outRoot, rel, body, plan)
  return rel
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  const a = parseArgs(process.argv.slice(2))
  const outRoot = resolve(a.out || "")
  if (!a.out) { out({ ok: false, errors: ["--out (slot root) is required"] }); process.exit(1) }
  const L = String(a.lang || "").trim()
  if (!L || !/^[a-z]{2}(-[A-Za-z0-9]+)?$/.test(L)) { out({ ok: false, errors: [`--lang must be a BCP-47 code, got ${JSON.stringify(a.lang)}`] }); process.exit(1) }

  const langs = await slotLanguages(outRoot)
  const def = await defaultLocale(outRoot, langs)
  if (!langs.includes(L)) fail(`language '${L}' is not in the slot's set [${langs.join(",")}] — add it via App Settings (rebuild) FIRST, THEN fan out (steps 138/143/150).`)
  if (L === def) fail(`'${L}' is the default language — its content already exists; nothing to fan out.`)
  if (errs.length) done(null, {})

  const plan = a["dry-run"] ? { write: [] } : null
  const groups = await listGroups(outRoot)
  const seededPages = []
  let groupsTouched = 0

  for (const tab of groups) {
    await seedGroupUi(outRoot, tab, L, def, plan)
    await patchGroupIndex(outRoot, tab, L, plan)
    await patchGroupManifest(outRoot, tab, L, plan)
    await patchPostMapper(outRoot, tab, plan)
    groupsTouched++
    for (const slug of await listPosts(outRoot, tab)) {
      const seeded = await seedPostOverride(outRoot, tab, slug, L, def, plan)
      await patchPostIndex(outRoot, tab, slug, L, plan)
      if (seeded || plan) seededPages.push(`/${L}/${tab}/${slug}`)
    }
  }

  // Write the open translation step only when something was actually seeded this run
  // (an idempotent rerun that seeds nothing must not spawn a duplicate empty step).
  const stepFile = (plan || seededPages.length > 0) ? await writeTranslationStep(outRoot, L, seededPages, plan) : null
  done(plan, {
    lang: L, default: def, groups: groupsTouched, pages: seededPages.length,
    pagesNeedingTranslation: seededPages, translationStep: stepFile,
    note: plan ? "dry-run — nothing written" :
      `Seeded '${L}' with '${def}' content (noindex until translated). REBUILD (Deploy) to publish the new routes; then run translate-pending-pages. Record a Deployments row.`,
  })
}

main().catch(e => { out({ ok: false, errors: [`fan-out-site-language: ${e.message}`] }); process.exit(1) })
