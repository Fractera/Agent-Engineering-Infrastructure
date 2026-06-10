import type { RouteMeta } from "./route-meta"
import homeMeta from "@/app/_meta"
import dashboardMeta from "@/app/dashboard/_meta"
import aiCoreMeta from "@/app/ai-core/_meta"
import architectureMeta from "@/app/architecture/_meta"
import debugMeta from "@/app/debug/_meta"
import requestedApiMeta from "@/app/api/project/default/architecture/requested/_meta"
import tasksApiMeta from "@/app/api/project/default/architecture/tasks/_meta"
import taskIdApiMeta from "@/app/api/project/default/architecture/tasks/[id]/_meta"
import projectsApiMeta from "@/app/api/projects/_meta"
import telegramReminderMeta from "@/app/project/my-telegram-reminder/_meta"
import sourceApiMeta from "@/app/api/project/default/source/_meta"
import routingApiMeta from "@/app/api/project/default/routing/_meta"
import signatureApiMeta from "@/app/api/project/default/architecture/signature/_meta"

// Hand-maintained manifest of the typed route descriptors (`_meta.ts`), keyed by
// path. Variant A: typed .ts imported here (a later codegen can glob these). The
// /architecture detail panel renders the real RouteMeta from this manifest.
export const ROUTE_MANIFEST: Record<string, RouteMeta> = {
  "/": homeMeta,
  "/dashboard": dashboardMeta,
  "/ai-core": aiCoreMeta,
  "/architecture": architectureMeta,
  "/debug": debugMeta,
  "/api/project/default/architecture/requested": requestedApiMeta,
  "/api/project/default/architecture/tasks": tasksApiMeta,
  "/api/project/default/architecture/tasks/[id]": taskIdApiMeta,
  "/api/projects": projectsApiMeta,
  "/project/my-telegram-reminder": telegramReminderMeta,
  "/api/project/default/source": sourceApiMeta,
  "/api/project/default/routing": routingApiMeta,
  "/api/project/default/architecture/signature": signatureApiMeta,
}

export function routeMetaFor(key: string | undefined | null): RouteMeta | null {
  if (!key) return null
  return ROUTE_MANIFEST[key] ?? null
}
