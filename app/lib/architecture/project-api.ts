import { DEFAULT_PROJECT } from "./projects"

// Project-scoped API namespace (ARCHITECTURE §3.12). Content endpoints live under
// /api/project/<slug>/… so every call self-declares its project. Today the active
// project is the default (the root); when project switching lands, callers pass
// the active slug instead of relying on the constant.
export const ACTIVE_PROJECT = DEFAULT_PROJECT

export function projectApi(path: string, project: string = ACTIVE_PROJECT): string {
  return `/api/project/${project}${path.startsWith("/") ? path : `/${path}`}`
}
