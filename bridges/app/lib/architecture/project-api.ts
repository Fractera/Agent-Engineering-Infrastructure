import { DEFAULT_PROJECT } from "./projects"

// Project-scoped API namespace (ARCHITECTURE §3.12). Content endpoints live under
// a REAL named folder per project — /api/project/default/…, /api/project/<slug>/…
// — never a dynamic [project] segment. A project's pages/endpoints are all
// different, so each is a real, visible route the agent physically creates (the
// project layer forbids dynamic routes; see §3.12). Today the active project is
// the default; when project switching lands, callers pass the slug whose real
// folder exists.
export const ACTIVE_PROJECT = DEFAULT_PROJECT

export function projectApi(path: string, project: string = ACTIVE_PROJECT): string {
  return `/api/project/${project}${path.startsWith("/") ? path : `/${path}`}`
}
