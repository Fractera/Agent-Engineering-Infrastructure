import { resolve, join } from "node:path"

// The service pages (Architecture, Glossary, Patterns, …) were moved out of the
// guest slot (fractera-app :3000) into this admin app (:3002) so they survive a
// slot rebuild. But their DATA still lives in the SLOT's filesystem — GLOSSARY.md,
// DEVELOPMENT-STEPS/, PATTERNS/, AI-DRAFT-SETTINGS/, CRUD-DOCS/, app/**/README.md,
// the agents' dotdirs. In the slot those were reached via process.cwd(); here cwd
// is the admin app, so every such access must resolve through slotRoot() instead.
//
// Layout on the server: /opt/fractera/bridges/app (this app) and /opt/fractera/app
// (the slot) are siblings two levels up. SLOT_DIR overrides for local/dev or a
// relocated slot. The slot is a SWAPPABLE mount and may be empty or absent — every
// caller must degrade gracefully (missing dir/file -> empty state, never a crash).
export function slotRoot(): string {
  const override = process.env.SLOT_DIR?.trim()
  if (override) return resolve(override)
  return resolve(process.cwd(), "../../app")
}

// Convenience: resolve a path INSIDE the slot root.
export function slotPath(...segments: string[]): string {
  return join(slotRoot(), ...segments)
}
