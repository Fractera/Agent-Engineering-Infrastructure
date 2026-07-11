import { resolve, join } from "node:path"

// The Projects layer moved out of the guest slot into its own runtime in step 197:
// fractera-projects (:3003), code at /opt/fractera/projects-app. The architect
// service pages (/service/architecture) still introspect it — but its DATA now
// lives in the projects-app filesystem, not the slot's. Mirror of slot-root.ts.
//
// Layout on the server: /opt/fractera/bridges/app (this app) and
// /opt/fractera/projects-app are siblings two levels up. PROJECTS_DIR overrides
// for local/dev (same env the cron/listener processes use). The directory may be
// absent on old servers — every caller must degrade gracefully (missing dir ->
// empty state, never a crash).
export function projectsRoot(): string {
  const override = process.env.PROJECTS_DIR?.trim()
  if (override) return resolve(override)
  return resolve(process.cwd(), "../../projects-app")
}

// Convenience: resolve a path INSIDE the projects-app root.
export function projectsPath(...segments: string[]): string {
  return join(projectsRoot(), ...segments)
}
