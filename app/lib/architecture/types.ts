// Architecture page — node model for the visual project tree.
// One seed catalogue (tree.ts) feeds the Windows-Explorer-style left tree and
// the right detail panel. Data-driven so the tree extends without touching the
// renderer. Designed to later become an auto-generated manifest (the "one
// compact file both human and AI read") — keep nodes serialisable, no JSX here.

export type ArchKind =
  | "layer"      // L1 / L2 conceptual layer
  | "service"    // a PM2 process / running service
  | "platform"   // one of the 5 AI coding platforms
  | "group"      // a folder-like grouping (e.g. "Skills", "MCP")
  | "skill"      // a single agent skill
  | "mcp"        // a single MCP server / tool
  | "config"     // a config artefact (config.yaml, SOUL.md, …)
  | "page"       // a routable page in the app (route tree)
  | "api"        // an API endpoint (route tree)
  | "note"       // free leaf

export type ArchNode = {
  id: string
  label: string
  kind: ArchKind
  /** Port or port range, shown as a chip next to services. */
  port?: string
  /** Extended description rendered in the right panel (plain text / light md). */
  description?: string
  /** When set, the detail panel offers an "Open" link (used by the route tree). */
  href?: string
  /** Optional metadata rendered as a small grid in the detail panel. Used by the
   *  route tree to surface roles / rendering / method per page. */
  meta?: {
    roles?: string
    rendering?: "static" | "dynamic"
    method?: string
  }
  /** When true, the children list renders a trailing "+" add affordance. */
  addable?: boolean
  /** Label for the add affordance (defaults to "Add"). */
  addLabel?: string
  children?: ArchNode[]
}
