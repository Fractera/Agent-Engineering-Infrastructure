import type { RouteMeta } from "./route-meta"
import homeMeta from "@/app/_meta"
import dashboardMeta from "@/app/dashboard/_meta"
import aiCoreMeta from "@/app/ai-core/_meta"
import architectureMeta from "@/app/architecture/_meta"
import debugMeta from "@/app/debug/_meta"
import requestedApiMeta from "@/app/api/architecture/requested/_meta"

// Hand-maintained manifest of the typed route descriptors (`_meta.ts`), keyed by
// path. Variant A: typed .ts imported here (a later codegen can glob these). The
// /architecture detail panel renders the real RouteMeta from this manifest.
export const ROUTE_MANIFEST: Record<string, RouteMeta> = {
  "/": homeMeta,
  "/dashboard": dashboardMeta,
  "/ai-core": aiCoreMeta,
  "/architecture": architectureMeta,
  "/debug": debugMeta,
  "/api/architecture/requested": requestedApiMeta,
}

export function routeMetaFor(key: string | undefined | null): RouteMeta | null {
  if (!key) return null
  return ROUTE_MANIFEST[key] ?? null
}
