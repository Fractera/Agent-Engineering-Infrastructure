#!/usr/bin/env node
// compose-frozen-template — the Frozen Template Constructor's deterministic COMPOSER.
//
// Assembles a whole structure into a slot from a small basis of VETTED frozen bricks,
// BY CONSTRUCTION — pure file copy + token substitution, ZERO code generation. Any
// model (Hermes / Codex / Claude / Gemini / Qwen / Kimi) produces the identical result.
// Strategy: CRUD-DOCS/workspace-standards/frozen-template-constructor.md.
//
// It does three things, in order:
//   1) MATCH the request to a primitive by ENVELOPE (100%-fit). BASE axes
//      (source, depth, rendering) SELECT the primitive; a mismatch => HONEST REFUSAL
//      naming the failing axis (exit 2, JSON on stdout). ASPECT axes (i18n, roles) are
//      toggles the primitive must SUPPORT.
//   2) INSTALL the engine: versioned renderer into lib/content-<ver>/ (copy-if-absent
//      per version, side-by-side; never overwrites an old version) + shared, unversioned
//      identity/infra (brand, author, languages, seo, utils, placeholders).
//   3) COMPOSE the structure through the SEAMS:
//        - list provider (Slot A): copy providers/<source>/list-provider.ts -> tab _lib/
//        - aspects (Slot B): inject enabled aspect wrappers into the tab layout uniformly
//        - base tab tree + N placeholder documents; wire parser-fs COLLECTIONS + sitemap.
//
// Usage:
//   node compose-frozen-template.mjs --store <frozen-templates-dir> --out <slot-root> \
//     --source files --depth 1 --rendering static \
//     --tab news --format news --languages en,ru --label-en News --label-ru Новости \
//     --samples 2 --roles off [--unauthorized-redirect /] [--engine-version v1] [--force]
//     [--menus '{"top":{"enabled":true,"order":10}}'] [--children-dropdown true]
//   --roles: off (public) | guest (public+guest) | <csv of ALL_ROLES> (private) | all
//   --unauthorized-redirect: fallback page for a visitor lacking the role (default '/')
//   --menus: group REGISTRATION metadata (step 158) — JSON {top,footer,left,right}, each
//     {enabled,order}. Default every slot disabled, order 10 (explicit opt-in). Emitted into
//     _data/group.ts (GroupManifest) for the site menu system; NOT a Slot A/B property.
//   --children-dropdown: true => the menu expands the group's child pages as a dropdown;
//     false (default) => the button navigates to the group index route.
//
// Deterministic, idempotent-guarded, never writes outside --out.

import { mkdir, writeFile, readFile, readdir, stat } from "node:fs/promises"
import { join, resolve, dirname, relative } from "node:path"

function parseArgs(argv) {
  const a = {}
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]
    if (k.startsWith("--")) {
      const key = k.slice(2)
      const next = argv[i + 1]
      if (next === undefined || next.startsWith("--")) { a[key] = true }
      else { a[key] = next; i++ }
    }
  }
  return a
}
const exists = async p => { try { await stat(p); return true } catch { return false } }

// Default language set = the SLOT'S OWN authority (NEXT_PUBLIC_SUPPORTED_LANGUAGES in the slot's
// .env.local), NEVER a hardcoded "en,ru" (step 149 — language-safety vaccine). Composing content for
// a language the app does not ship is exactly the bug this vaccinates: generate strictly within the
// app's declared set; with no env, fall back to English only — never silently inject another language.
async function defaultLanguagesFromSlot(outRoot) {
  for (const rel of [".env.local", "app/.env.local"]) {
    try {
      const env = await readFile(join(outRoot, rel), "utf8")
      const m = env.match(/^\s*NEXT_PUBLIC_SUPPORTED_LANGUAGES\s*=\s*(.+?)\s*$/m)
      if (m) {
        const langs = m[1].trim().replace(/^["']|["']$/g, "").split(",").map(s => s.trim()).filter(Boolean)
        if (langs.length) return langs.join(",")
      }
    } catch { /* no env file at this path — try the next */ }
  }
  return "en"
}
function pascal(s) { return String(s).split(/[^a-z0-9]+/i).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join("") }
function camel(s) { const p = pascal(s); return p ? p[0].toLowerCase() + p.slice(1) : p }
async function walk(dir, base = dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, e.name)
    if (e.isDirectory()) await walk(full, base, out); else out.push(relative(base, full))
  }
  return out
}
function applyTokens(text, tok) { let o = text; for (const [k, v] of Object.entries(tok)) o = o.split(k).join(v); return o }
function applyPathTokens(relPath, tok) { return relPath.replace(/\.tpl$/, "").split("{{TAB}}").join(tok["{{TAB}}"]) }

// versioning: pin @/lib/content + @/components/content-page to the version namespace;
// identity (@/lib/brand, @/lib/author) + shared infra are NOT rewritten.
function versionizeContent(t, ver) {
  return t.split("@/lib/content").join(`@/lib/content-${ver}`)
          .split("@/components/content-page").join(`@/components/content-page-${ver}`)
}
function versionizePath(rel, ver) {
  return rel.replace(/^lib\/content\//, `lib/content-${ver}/`)
            .replace(/^components\/content-page\//, `components/content-page-${ver}/`)
}
const isVersioned = r => r.startsWith("lib/content/") || r.startsWith("components/content-page/")

async function writeOut(outRoot, relDest, content) {
  const dest = join(outRoot, relDest)
  if (!resolve(dest).startsWith(resolve(outRoot))) throw new Error(`refusing to write outside out: ${relDest}`)
  // HARD GATE: no unsubstituted {{TOKEN}} may ship — it would be broken TS at build
  // time (a token left in a COMMENT still corrupts the file). Catch ANY template, not
  // just known ones. Abort BEFORE writing so a half-composed tab never reaches a build.
  const leftover = content.match(/\{\{[A-Za-z0-9_]+\}\}/g)
  if (leftover) throw new Error(`unsubstituted token(s) ${[...new Set(leftover)].join(", ")} in ${relDest} — refusing to emit (template bug; tokens must not appear in comments)`)
  await mkdir(dirname(dest), { recursive: true }); await writeFile(dest, content, "utf8")
  console.log("emit", relDest)
}
function refuse(axis, detail) {
  console.log(JSON.stringify({ refused: true, axis, detail }))
  process.exit(2)
}

// Broken/replacement characters from a lossy encoding step (U+FFFD/U+FFFC, C0/C1 control chars
// except tab/LF/CR — e.g. a 0x13 byte left where an accented letter belonged, rendering a box —
// and UTF-8-read-as-Latin1 mojibake). Refused so a corrupted label never gets baked into the site.
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

// The project role vocabulary (mirrors fractera-next-starter/lib/roles.ts ALL_ROLES).
// Used to VALIDATE --roles and to expand --roles all.
const ALL_ROLES = ["guest", "user", "architect", "buyer", "vip_user", "subscriber_lite", "subscriber_standard", "subscriber_max", "manager", "senior_manager", "support_manager", "delivery_manager", "finance", "content_editor", "admin"]

// ── engine (versioned + shared, copy-if-absent) ──────────────────────────────
async function installEngine(storeRoot, outRoot, ver) {
  const engineDir = join(storeRoot, "engine")
  if (!(await exists(engineDir))) { console.log("engine: none, skip"); return }
  // Per-file copy-if-absent: install any engine file the slot is missing without
  // overwriting an existing one. This is correct idempotent semantics AND it picks
  // up NEW shared files (e.g. lib/auth-guard) added to the engine after a slot was
  // first composed — an all-or-nothing skip would leave those missing and break the build.
  let copied = 0, kept = 0
  for (const rel of await walk(engineDir)) {
    const r = rel.replace(/\\/g, "/")
    const versioned = isVersioned(r)
    const destRel = (versioned ? versionizePath(r, ver) : r).replace(/\.tpl$/, "")
    if (await exists(join(outRoot, destRel))) { kept++; continue }
    const raw = await readFile(join(engineDir, rel), "utf8")
    await writeOut(outRoot, destRel, versioned ? versionizeContent(raw, ver) : raw)
    copied++
  }
  console.log(`engine (${ver}): ${copied} copied, ${kept} kept`)
}

// ── compose the tab through the seams ────────────────────────────────────────
async function composeTab(storeRoot, primDir, outRoot, tok, opts) {
  const { tab, languages, labels, samples, ver, source, rolesOn, requireGuest, roleList, unauthorizedRedirect, force } = opts
  const vz = s => versionizeContent(s, ver)
  const tabSrc = join(primDir, "tab", "app", "[lang]", "{{TAB}}")
  const tabDest = join("app", "[lang]", tab)
  if (await exists(join(outRoot, tabDest)) && !force) throw new Error(`refusing to overwrite ${tabDest} (use --force)`)

  // aspect tokens (Slot B) — uniform, injected into the tab layout. Roles use the SHARED
  // client guard (static-first preserved; the engine ships @/lib/auth-guard/route-guard.client).
  const aspectTok = { "{{ASPECT_IMPORTS}}": "", "{{ASPECT_OPEN}}": "", "{{ASPECT_CLOSE}}": "" }
  if (rolesOn) {
    const group = `group=${JSON.stringify(labels.en)}`   // section name for the access-denied toast
    const props = requireGuest
      ? `requireGuest unauthorizedRedirect=${JSON.stringify(unauthorizedRedirect)} ${group}`
      : `roles={${JSON.stringify(roleList)}} unauthorizedRedirect=${JSON.stringify(unauthorizedRedirect)} ${group}`
    aspectTok["{{ASPECT_IMPORTS}}"] = `import { RouteGuard } from '@/lib/auth-guard/route-guard.client'`
    aspectTok["{{ASPECT_OPEN}}"] = `<RouteGuard ${props}>`
    aspectTok["{{ASPECT_CLOSE}}"] = `</RouteGuard>`
  }
  const T = { ...tok, ...aspectTok }

  // 1) tab-level files (skip __ITEM__, per-lang partial, and the data files handled below)
  for (const rel of await walk(tabSrc)) {
    const r = rel.replace(/\\/g, "/")
    if (r.split("/").includes("__ITEM__")) continue
    if (r === "_data/_lang.partial.ts.tpl" || r === "_data/en.ts.tpl" || r === "_data/index.ts.tpl") continue
    await writeOut(outRoot, join(tabDest, applyPathTokens(rel, tok)), vz(applyTokens(await readFile(join(tabSrc, rel), "utf8"), T)))
  }

  // 2) SEAM (Slot A): copy the selected list provider into the tab _lib
  const providerSrc = join(storeRoot, "providers", source, "list-provider.ts.tpl")
  if (!(await exists(providerSrc))) throw new Error(`list provider not found for source=${source}`)
  await writeOut(outRoot, join(tabDest, "_lib", "list-provider.ts"), vz(applyTokens(await readFile(providerSrc, "utf8"), T)))

  // 3) SEAM (Slot B): the role guard is the SHARED client guard installed by the engine
  //    (@/lib/auth-guard/route-guard.client) — nothing to copy per-tab. The server-hide
  //    alternative (aspects/roles/role-guard.server.tsx.tpl) is documented in the layout,
  //    not injected (it would make the group dynamic — architect-only exception).

  // 4) _data/en.ts (full base UI, label) + per-lang partials + index lang-map
  const enTpl = await readFile(join(tabSrc, "_data", "en.ts.tpl"), "utf8")
  await writeOut(outRoot, join(tabDest, "_data", "en.ts"), vz(applyTokens(enTpl, { ...T, "{{LABEL}}": labels.en })))
  const partialTpl = await readFile(join(tabSrc, "_data", "_lang.partial.ts.tpl"), "utf8")
  const extra = languages.filter(l => l !== "en")
  for (const lang of extra) {
    await writeOut(outRoot, join(tabDest, "_data", `${lang}.ts`), vz(applyTokens(partialTpl, { ...T, "{{LANG}}": lang, "{{LABEL}}": labels[lang] ?? labels.en })))
  }
  const idxTpl = await readFile(join(tabSrc, "_data", "index.ts.tpl"), "utf8")
  const allLangs = ["en", ...extra]
  await writeOut(outRoot, join(tabDest, "_data", "index.ts"), vz(applyTokens(idxTpl, { ...T, "{{LANG_IMPORTS}}": allLangs.map(l => `import { ${l} } from './${l}'`).join("\n"), "{{LANG_MAP}}": allLangs.join(", ") })))

  // 5) placeholder documents (__ITEM__)
  const itemSrc = join(tabSrc, "__ITEM__")
  const overrideLangs = extra.filter(l => l === "ru")
  for (let i = 1; i <= samples; i++) {
    const slug = `sample-${i}`, date = new Date(Date.now() - (i - 1) * 86400000).toISOString().slice(0, 10)
    const st = { ...T, "{{LABEL}}": labels.en, "{{SAMPLE_SLUG}}": slug, "{{SAMPLE_INDEX}}": String(i), "{{SAMPLE_DATE}}": date, "{{ITEM_SLUG}}": slug, "{{ITEM_INDEX}}": String(i), "{{ITEM_DATE}}": date }
    for (const rel of await walk(itemSrc)) {
      const r = rel.replace(/\\/g, "/")
      if (r === "_data/ru.ts.tpl" || r === "_data/index.ts.tpl") continue
      await writeOut(outRoot, join(tabDest, slug, r.replace(/\.tpl$/, "")), vz(applyTokens(await readFile(join(itemSrc, rel), "utf8"), st)))
    }
    if (overrideLangs.includes("ru")) {
      await writeOut(outRoot, join(tabDest, slug, "_data", "ru.ts"), vz(applyTokens(await readFile(join(itemSrc, "_data", "ru.ts.tpl"), "utf8"), st)))
    }
    const pIdx = await readFile(join(itemSrc, "_data", "index.ts.tpl"), "utf8")
    await writeOut(outRoot, join(tabDest, slug, "_data", "index.ts"), vz(applyTokens(pIdx, { ...st, "{{POST_OVERRIDE_IMPORTS}}": overrideLangs.map(l => `import { ${l} } from './${l}'`).join("\n"), "{{POST_OVERRIDES}}": overrideLangs.join(", "), "{{ITEM_OVERRIDE_IMPORTS}}": overrideLangs.map(l => `import { ${l} } from './${l}'`).join("\n"), "{{ITEM_OVERRIDES}}": overrideLangs.join(", ") })))
  }

  // 6) _list.generated.ts — write it DIRECTLY (don't depend on parser-fs / build
  //    hooks existing in the slot). The index imports POSTS from ../_list.generated;
  //    a missing file = "Module not found" build failure. parser-fs (installed by the
  //    engine) regenerates this on later builds when the owner adds posts.
  const slugs = Array.from({ length: samples }, (_, i) => `sample-${i + 1}`)
  const listBody = `// AUTO-GENERATED (composer) — regenerated by lib/parser-fs.mjs on build. DO NOT EDIT.
import type { ${tok["{{TAB_PASCAL}}"]}Data } from './_lib/post'
${slugs.map((s, i) => `import { data as p${i} } from './${s}/_data'`).join("\n")}

export const POSTS: ${tok["{{TAB_PASCAL}}"]}Data[] = [${slugs.map((_, i) => `p${i}`).join(", ")}]
`
  await writeOut(outRoot, join(tabDest, "_list.generated.ts"), listBody)
  return { tabDest }
}

// Ensure the slot's package.json has the list-generation scripts so future
// hand-added posts are auto-discovered (predev/prebuild) — idempotent.
async function patchPackageJson(outRoot) {
  const pj = join(outRoot, "package.json")
  if (!(await exists(pj))) { console.log("package.json: not found, skip scripts"); return }
  const json = JSON.parse(await readFile(pj, "utf8"))
  json.scripts = json.scripts || {}
  let changed = false
  const want = { "gen:lists": "node lib/parser-fs.mjs" }
  for (const [k, v] of Object.entries(want)) if (!json.scripts[k]) { json.scripts[k] = v; changed = true }
  // chain parser-fs into existing predev/prebuild (or create them) without clobbering
  for (const hook of ["predev", "prebuild"]) {
    const cur = json.scripts[hook]
    if (!cur) { json.scripts[hook] = "node lib/parser-fs.mjs"; changed = true }
    else if (!cur.includes("parser-fs")) { json.scripts[hook] = `node lib/parser-fs.mjs && ${cur}`; changed = true }
  }
  if (changed) { await writeFile(pj, JSON.stringify(json, null, 2) + "\n", "utf8"); console.log("package.json: list-generation scripts ensured") }
  else console.log("package.json: scripts already present")
}

async function registerCollection(outRoot, tab, tabPascal) {
  const pf = join(outRoot, "lib", "parser-fs.mjs")
  if (!(await exists(pf))) { console.log("parser-fs: not found, skip"); return }
  let src = await readFile(pf, "utf8")
  if (src.includes(`app/[lang]/${tab}`)) { console.log("parser-fs: already registered"); return }
  const m = src.match(/COLLECTIONS\s*=\s*\[/)
  if (!m) { console.log("parser-fs: COLLECTIONS not found — MANUAL"); return }
  const at = m.index + m[0].length
  src = src.slice(0, at) + `\n  { dir: 'app/[lang]/${tab}', type: '${tabPascal}Data', typeModule: './_lib/post' },` + src.slice(at)
  await writeFile(pf, src, "utf8"); console.log("parser-fs: registered", tab)
}
async function appendSitemap(outRoot, tab) {
  const sm = join(outRoot, "app", "sitemap.ts")
  if (!(await exists(sm))) { console.log("sitemap: not found, skip"); return }
  if ((await readFile(sm, "utf8")).includes(`/${tab}`)) { console.log("sitemap: already lists"); return }
  console.log(`sitemap: add '/${tab}' to app/sitemap.ts (MANUAL — structure varies)`)
}

async function main() {
  const a = parseArgs(process.argv.slice(2))
  const storeRoot = resolve(a.store || ""), outRoot = resolve(a.out || "")
  if (!a.store || !(await exists(join(storeRoot, "registry.json")))) throw new Error("--store must point at the frozen-templates dir (with registry.json)")
  if (!a.out) throw new Error("--out is required")
  const registry = JSON.parse(await readFile(join(storeRoot, "registry.json"), "utf8"))

  // request envelope
  const source = a.source || "files", depth = parseInt(a.depth ?? "1", 10), rendering = a.rendering || "static"
  const rolesArg = (a.roles && a.roles !== "off" && a.roles !== true) ? String(a.roles) : "off"
  const unauthorizedRedirect = (typeof a["unauthorized-redirect"] === "string" && a["unauthorized-redirect"]) || "/"
  const i18nReq = "multi"

  // MATCH — base axes select a primitive; refuse naming the failing axis
  const prim = registry.primitives.find(p => p.status === "ready" && p.base.source === source && p.base.depth === depth && p.base.rendering === rendering)
  if (!prim) {
    if (rendering !== "static") return refuse("rendering", `no static primitive for rendering=${rendering}; a non-static structure needs the dynamic-descriptor brick (roadmap) or classic development`)
    if (!registry.primitives.some(p => p.base.source === source)) return refuse("source", `no primitive for source=${source} (declared providers: ${registry.providers.map(x => x.id).join(", ")}); roadmap or classic development`)
    if (!registry.primitives.some(p => p.base.depth === depth)) return refuse("depth", `no primitive for depth=${depth}; only depth=1 is harvested so far (roadmap)`)
    return refuse("envelope", `no primitive fits source=${source}, depth=${depth}, rendering=${rendering}`)
  }
  if (rolesArg !== "off" && !prim.aspects.includes("roles")) return refuse("roles", `primitive ${prim.id} does not support the roles aspect`)
  if (!prim.aspects.includes("i18n")) return refuse("i18n", `primitive ${prim.id} does not support i18n`)

  // params
  const tab = a.tab
  if (!tab || tab === true || !/^[a-z][a-z0-9-]*$/.test(tab)) throw new Error('--tab is required, kebab-case')
  const format = ["news", "blog", "document"].includes(a.format) ? a.format : "news"
  const languages = String(a.languages || await defaultLanguagesFromSlot(outRoot)).split(",").map(s => s.trim()).filter(Boolean)
  if (!languages.includes("en")) languages.unshift("en")
  const samples = Math.max(0, Math.min(10, parseInt(a.samples ?? "2", 10) || 0))
  const labels = { en: a["label-en"] || pascal(tab) }
  for (const l of languages) { const v = a[`label-${l}`]; if (typeof v === "string") labels[l] = v }
  for (const [l, v] of Object.entries(labels)) if (hasBrokenChar(v)) return refuse("encoding", `the ${l} label ${JSON.stringify(v)} contains a broken/replacement character (U+FFFD, a control byte, or mojibake — a lossy-encoding artifact). Fix the label text and retry; never bake a corrupted label.`)
  const ver = String(a["engine-version"] || prim.engineVersion || registry.engineVersion || "v1").replace(/[^a-z0-9]/gi, "")
  const rolesOn = rolesArg !== "off"
  const requireGuest = rolesArg === "guest"
  let roleList = []
  if (rolesOn && !requireGuest) {
    roleList = rolesArg === "all" ? [...ALL_ROLES] : rolesArg.split(",").map(s => s.trim()).filter(Boolean)
    const bad = roleList.filter(r => !ALL_ROLES.includes(r))
    if (bad.length) return refuse("roles", `unknown role(s): ${bad.join(", ")}. Valid (ALL_ROLES): ${ALL_ROLES.join(", ")}; or 'guest' (public+guest) / 'all'`)
  }
  const tok = { "{{TAB}}": tab, "{{TAB_PASCAL}}": pascal(tab), "{{TAB_CAMEL}}": camel(tab), "{{FORMAT}}": format }

  // ── group manifest (step 158): menu placement + envelope echo, emitted into _data/group.ts.
  // Registration metadata (NOT Slot A/B). Default: every slot disabled, order 10 (explicit
  // opt-in); --menus overrides per slot. groupRoles echoes the resolved access shape.
  const MENU_SLOTS = ["top", "footer", "left", "right"]
  const menus = Object.fromEntries(MENU_SLOTS.map(s => [s, { enabled: false, order: 10 }]))
  if (typeof a.menus === "string") {
    let parsed; try { parsed = JSON.parse(a.menus) } catch { throw new Error("--menus must be valid JSON") }
    for (const s of MENU_SLOTS) {
      const m = parsed && parsed[s]
      if (m && typeof m === "object") menus[s] = { enabled: !!m.enabled, order: Number.isFinite(m.order) ? Math.trunc(m.order) : 10 }
    }
  }
  const childrenAsDropdown = a["children-dropdown"] === "true" || a["children-dropdown"] === true
  const groupRoles = rolesOn ? (requireGuest ? "public+guest" : roleList.join("+")) : "public"
  Object.assign(tok, {
    "{{GROUP_LANGUAGES}}": JSON.stringify(languages),
    "{{GROUP_ROLES}}": JSON.stringify(groupRoles),
    "{{CHILDREN_AS_DROPDOWN}}": String(childrenAsDropdown),
    "{{MENU_TOP_ENABLED}}": String(menus.top.enabled), "{{MENU_TOP_ORDER}}": String(menus.top.order),
    "{{MENU_FOOTER_ENABLED}}": String(menus.footer.enabled), "{{MENU_FOOTER_ORDER}}": String(menus.footer.order),
    "{{MENU_LEFT_ENABLED}}": String(menus.left.enabled), "{{MENU_LEFT_ORDER}}": String(menus.left.order),
    "{{MENU_RIGHT_ENABLED}}": String(menus.right.enabled), "{{MENU_RIGHT_ORDER}}": String(menus.right.order),
  })

  console.log(`compose '${prim.id}' (engine ${ver}) -> /${tab}  base{source=${source},depth=${depth},${rendering}} aspects{i18n=on, roles=${rolesOn ? (requireGuest ? "guest" : roleList.join("+")) : "off"}${rolesOn ? ", fallback=" + unauthorizedRedirect : ""}} format=${format} langs=${languages.join(",")} samples=${samples}`)
  await installEngine(storeRoot, outRoot, ver)
  const primDir = join(storeRoot, prim.path)
  const { tabDest } = await composeTab(storeRoot, primDir, outRoot, tok, { tab, languages, labels, samples, ver, source, rolesOn, requireGuest, roleList, unauthorizedRedirect, force: !!a.force })
  await registerCollection(outRoot, tab, pascal(tab))
  await patchPackageJson(outRoot)
  await appendSitemap(outRoot, tab)
  console.log(`\ncomposed ${prim.id} -> ${tabDest}\nnext: REBUILD the slot (Deploy) to see it; then \`npx tsc --noEmit\``)
}

main().catch(e => { console.error("compose-frozen-template:", e.message); process.exit(1) })
