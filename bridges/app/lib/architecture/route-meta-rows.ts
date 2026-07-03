import type { RouteMeta } from "./route-meta"

// Formats a RouteMeta into display sections (string rows) for the detail panel's
// accordion. Pure presentation logic kept out of the component.
export function fmt(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—"
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—"
  if (typeof v === "boolean") return v ? "yes" : "no"
  return String(v)
}

export type MetaSection = { title: string; rows: [string, string][] }

export function buildMetaSections(meta: RouteMeta): MetaSection[] {
  const raw: { title: string; rows: [string, unknown][] }[] = [
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
  return raw.map(s => ({ title: s.title, rows: s.rows.map(([k, v]) => [k, fmt(v)] as [string, string]) }))
}
