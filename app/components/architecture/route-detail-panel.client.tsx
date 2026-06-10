"use client"

import { ArrowUpRight } from "lucide-react"
import type { RouteMeta } from "@/lib/architecture/route-meta"

// Right ~50% panel for the /architecture route tree. Renders the real RouteMeta
// descriptor (the standard) grouped by section, with "Open page" in the top-right
// corner. Replaces the legacy roles/rendering/method view — this is the full
// model the route actually carries in its _meta.ts.

function fmt(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—"
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—"
  if (typeof v === "boolean") return v ? "yes" : "no"
  return String(v)
}

function statusClass(s: string): string {
  if (s === "live") return "border-green-500/30 text-green-400"
  if (s === "requested") return "border-amber-500/30 text-amber-400"
  if (s === "wip") return "border-blue-500/30 text-blue-400"
  return "border-border text-muted-foreground"
}

export function RouteDetailPanel({ meta }: { meta: RouteMeta }) {
  const sections: { title: string; rows: [string, unknown][] }[] = [
    { title: "Access", rows: [
      ["Visibility", meta.visibility],
      ["Roles", meta.roles],
      ["Enforced by", meta.enforcedBy],
      ["Unauthorized →", meta.unauthorizedRedirect],
    ] },
    { title: "Routing", rows: [
      ["Dynamic route", meta.isDynamicRoute],
      ["Segment params", meta.segmentParams],
      ["dynamicParams", meta.dynamicParams],
      ["Prerendered params", meta.prerenderedParams],
      ["Route group", meta.routeGroup],
      ["Parallel slot", meta.parallelSlot],
      ["Parent layout", meta.parentLayout],
    ] },
    { title: "Rendering & caching", rows: [
      ["Rendering", meta.rendering],
      ["Revalidate", meta.revalidate],
      ["Runtime", meta.runtime],
      ["Cache", meta.cache],
      ["fetchCache", meta.fetchCache],
      ["maxDuration", meta.maxDuration],
      ["preferredRegion", meta.preferredRegion],
      ["revalidateTags", meta.revalidateTags],
    ] },
    { title: "SEO", rows: [
      ["Supports SEO", meta.seo.supportsSeo],
      ["Indexable", meta.seo.indexable],
      ["In sitemap", meta.seo.inSitemap],
      ["Canonical", meta.seo.canonical],
      ["Title", meta.seo.title],
      ["Meta description", meta.seo.metaDescription],
      ["OpenGraph", meta.seo.openGraph],
      ["OG image", meta.seo.ogImage],
      ["JSON-LD", meta.seo.jsonLd],
      ["Robots", meta.seo.robots],
    ] },
    { title: "i18n", rows: [
      ["Localized", meta.i18n.localized],
      ["Locales", meta.i18n.locales],
      ["Default locale", meta.i18n.defaultLocale],
    ] },
    { title: "Inputs", rows: [
      ["Query params", meta.queryParams.map(q => q.name)],
    ] },
    { title: "Composition", rows: [
      ["Entry component", meta.entryComponent],
      ["page.tsx client", meta.pageIsClient],
      ["Entry client", meta.entryIsClient],
      ["Local components", meta.localComponents],
      ["Shared components", meta.sharedComponents],
    ] },
    { title: "Boundaries", rows: [
      ["loading.tsx", meta.hasLoading],
      ["error.tsx", meta.hasError],
      ["not-found.tsx", meta.hasNotFound],
      ["layout.tsx", meta.hasLayout],
    ] },
    { title: "API", rows: [
      ["Methods", meta.methods],
    ] },
    { title: "Knowledge", rows: [
      ["Data dependencies", meta.dataDependencies],
      ["Related routes", meta.relatedRoutes],
      ["Notes", meta.notes],
    ] },
    { title: "Audit", rows: [
      ["Owner", meta.owner],
      ["Created by", meta.createdBy],
      ["Created at", meta.createdAt],
      ["Updated at", meta.updatedAt],
    ] },
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{meta.kind}</span>
            <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${statusClass(meta.status)}`}>{meta.status}</span>
          </div>
          <p className="mt-1.5 truncate font-mono text-sm font-medium text-foreground">{meta.path}</p>
          <p className="truncate font-mono text-[10px] text-muted-foreground/60">{meta.filePath}</p>
        </div>
        {meta.kind === "page" && (
          <a
            href={meta.path}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Open page <ArrowUpRight size={12} />
          </a>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">{meta.description}</p>

        {meta.todo.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-amber-400/90">Build tasks (todo)</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {meta.todo.map((t, i) => (
                <li key={i} className="flex gap-1.5 text-[11px] text-muted-foreground">
                  <span className="text-amber-400/60">•</span><span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-5">
          {sections.map(s => (
            <section key={s.title}>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">{s.title}</p>
              <div className="overflow-hidden rounded-lg border border-border">
                {s.rows.map(([k, v], i) => (
                  <div
                    key={k}
                    className={`flex items-start justify-between gap-4 px-3 py-1.5 text-xs ${i < s.rows.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <span className="shrink-0 text-muted-foreground">{k}</span>
                    <span className="break-all text-right font-mono text-foreground/90">{fmt(v)}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
