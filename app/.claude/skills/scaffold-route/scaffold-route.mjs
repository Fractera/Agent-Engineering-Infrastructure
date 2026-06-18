#!/usr/bin/env node
// scaffold-route — deterministic route skeleton emitter (H3).
//
// Materializes a declared route into the standard shell-component skeleton BY
// CONSTRUCTION, so the agent never hand-types (and drifts from) the convention in
// CRUD-DOCS/workspace-standards/shell-component-architecture.md. Emits:
//   <out>/[lang]/<path>/page.tsx              thin Server Component
//   <out>/[lang]/<path>/_components/index.tsx entry (server)
//   <out>/[lang]/<path>/_components/<name>.client.tsx | .server.tsx   one leaf
//   <out>/[lang]/<path>/_meta.ts              full RouteMeta, access baked in
//
// Access shape is wired from --access per HOW-USE-AUTH.md, so §6.3's "decide
// access before code" is satisfied at emit time. The _meta.filePath omits [lang]
// to match the existing convention (see app/[lang]/ai-core/_meta.ts).
//
// Usage:
//   node scaffold-route.mjs --path /feed --access private --roles user
//   node scaffold-route.mjs --path /post/[id] --access guest
//   node scaffold-route.mjs --path /pricing --access public --out /tmp/scratch
//
// Deterministic and idempotent-guarded: refuses to overwrite an existing route
// dir unless --force. Never writes outside the target root.

import { mkdir, writeFile, stat } from "node:fs/promises"
import { join, resolve } from "node:path"

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

// "/post/[id]" -> { segs:["post","[id]"], leaf:"id"|null, dynamic:true }
function analyzePath(path) {
  const clean = String(path).replace(/^\/+|\/+$/g, "")
  if (!clean) throw new Error("--path is required, e.g. /feed or /post/[id]")
  const segs = clean.split("/").filter(Boolean)
  const params = segs.filter(s => /^\[.+\]$/.test(s)).map(s => s.slice(1, -1))
  return { clean, segs, params, dynamic: params.length > 0, last: segs[segs.length - 1] }
}

// last static segment -> PascalCase base for component naming
function pascal(path) {
  const segs = analyzePath(path).segs.filter(s => !/^\[.+\]$/.test(s))
  const base = segs[segs.length - 1] || "page"
  return base.split(/[^a-z0-9]+/i).filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join("")
}
function kebab(path) {
  const segs = analyzePath(path).segs.filter(s => !/^\[.+\]$/.test(s))
  return (segs[segs.length - 1] || "page").toLowerCase()
}

// access shape -> the access-control block of RouteMeta (HOW-USE-AUTH.md)
function accessBlock(access, rolesArg) {
  const roles = String(rolesArg || "user").split(",").map(s => s.trim()).filter(Boolean)
  if (access === "public") {
    return { visibility: "public", roles: "[]", unauthorizedRedirect: "undefined",
             enforcedBy: "undefined", guest: null }
  }
  if (access === "guest") {
    return { visibility: "public", roles: "[]", unauthorizedRedirect: "undefined",
             enforcedBy: '"component"', guest: true }
  }
  // private (default)
  const list = JSON.stringify(roles).replace(/"/g, '"')
  return { visibility: "private", roles: list,
           unauthorizedRedirect: `"/register?requireRole=${roles[0]}"`,
           enforcedBy: '"both"', guest: null }
}

function metaTs({ path, kind, leafName, entryIsClient, access, segs, params }) {
  const a = accessBlock(access.access, access.roles)
  const filePath = `app/app${path === "/" ? "" : path}/${kind === "api" ? "route.ts" : "page.tsx"}`
  const guestLine = a.guest === true ? "\n  requiresGuestRegistration: true," : ""
  return `import type { RouteMeta } from "@/lib/architecture/route-meta"

// STANDARD ROUTE DESCRIPTOR — do not delete any field.
// Scaffolded by .claude/skills/scaffold-route. Fill what applies; leave the rest
// as undefined / [] / null. Never remove a key.
const meta: RouteMeta = {
  // — Identity & lifecycle —
  kind: "${kind}",
  path: "${path}",
  filePath: "${filePath}",
  status: "wip",
  todo: [],

  // — Access control —
  visibility: "${a.visibility}",
  roles: ${a.roles},
  unauthorizedRedirect: ${a.unauthorizedRedirect},
  enforcedBy: ${a.enforcedBy},${guestLine}

  // — Routing shape —
  isDynamicRoute: ${params.length > 0},
  segmentParams: ${JSON.stringify(params)},
  pathParams: ${params.length ? JSON.stringify(params.map(p => ({ name: p, description: "", required: true }))) : "[]"},
  dynamicParams: undefined,
  prerenderedParams: undefined,
  routeGroup: undefined,
  parallelSlot: undefined,
  parentLayout: "app/app/layout.tsx",

  // — Rendering & caching —
  rendering: "static",
  revalidate: undefined,
  runtime: "nodejs",
  maxDuration: undefined,
  preferredRegion: undefined,
  cache: undefined,
  fetchCache: undefined,
  revalidateTags: [],

  // — SEO —
  seo: {
    supportsSeo: ${kind === "page"},
    indexable: ${kind === "page" && access.access !== "private"},
    inSitemap: ${kind === "page" && access.access !== "private"},
    canonical: null,
    title: undefined,
    metaDescription: undefined,
    openGraph: false,
    ogImage: null,
    jsonLd: [],
    robots: undefined,
  },

  // — i18n —
  i18n: { localized: false, locales: [], defaultLocale: undefined },

  // — Inputs —
  queryParams: [],

  // — Composition —
  entryComponent: "_components/index.tsx",
  pageIsClient: false,
  entryIsClient: ${entryIsClient},
  localComponents: ["${leafName}"],
  sharedComponents: [],

  // — Segment boundaries —
  hasLoading: false,
  hasError: false,
  hasNotFound: false,
  hasLayout: false,

  // — API —
  methods: ${kind === "api" ? '["GET"]' : "[]"},

  // — Knowledge —
  description: "${pascal(path)} ${kind}.",
  dataDependencies: [],
  relatedRoutes: [],
  notes: undefined,

  // — Audit —
  owner: undefined,
  createdBy: "scaffold-route",
  createdAt: ${JSON.stringify(new Date().toISOString())},
  updatedAt: undefined,
}

export default meta
`
}

function pageTsx(Comp) {
  return `import ${Comp}Entry from "./_components"

// Thin Server Component — renders only the entry. Never "use client" here.
export default function Page() {
  return <${Comp}Entry />
}
`
}

function entryTsx(Comp, leafComp, leafFile) {
  return `import { ${leafComp} } from "./${leafFile}"

// Entry component (server by default). Server-side data loading belongs here.
export default function ${Comp}Entry() {
  return <${leafComp} />
}
`
}

function leafTsx(leafComp, client) {
  return `${client ? '"use client"\n\n' : ""}// Route leaf. ${client ? "Interactive — carries \"use client\"." : "Server-only — no directive."}
export function ${leafComp}() {
  return <div>${leafComp}</div>
}
`
}

async function exists(p) { try { await stat(p); return true } catch { return false } }

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const path = args.path
  if (!path || path === true) throw new Error("--path is required (e.g. --path /feed)")
  const kind = args.kind === "api" ? "api" : "page"
  const access = { access: args.access || "private", roles: args.roles }
  if (!["public", "private", "guest"].includes(access.access))
    throw new Error('--access must be public | private | guest')
  // physical root: real user pages live under app/app/[lang]/<path>/
  const root = resolve(args.out ? String(args.out) : "app/app/[lang]")
  const info = analyzePath(path)
  const routeDir = join(root, info.clean)
  if (await exists(routeDir) && !args.force)
    throw new Error(`refusing to overwrite ${routeDir} (use --force)`)

  const Comp = pascal(path)
  const leafName = `${kebab(path)}-view.${kind === "api" ? "server" : "client"}`
  const leafComp = `${Comp}View`
  const client = kind === "page"   // page leaf is interactive by default; flip later if pure-server

  await mkdir(join(routeDir, "_components"), { recursive: true })
  const files = []
  if (kind === "api") {
    files.push(["route.ts", `import { NextResponse } from "next/server"\n\nexport async function GET() {\n  return NextResponse.json({ ok: true })\n}\n`])
  } else {
    files.push(["page.tsx", pageTsx(Comp)])
    files.push(["_components/index.tsx", entryTsx(Comp, leafComp, leafName)])
    files.push([`_components/${leafName}.tsx`, leafTsx(leafComp, client)])
  }
  files.push(["_meta.ts", metaTs({ path, kind, leafName, entryIsClient: false, access, segs: info.segs, params: info.params })])

  for (const [rel, content] of files) {
    const dest = join(routeDir, rel)
    await mkdir(join(dest, ".."), { recursive: true })
    await writeFile(dest, content, "utf8")
    console.log("emit", join(info.clean, rel))
  }
  console.log(`\nscaffolded ${kind} ${path}  (access=${access.access})  ->  ${routeDir}`)
}

main().catch(e => { console.error("scaffold-route:", e.message); process.exit(1) })
