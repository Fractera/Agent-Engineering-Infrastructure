// System / utility pages of the real app (Shell): the operator-facing surfaces
// that are NOT part of the public product content — a map, a diagnostics page,
// a route map. Single source so the route tree and the start screen agree.
//
// FUTURE-PROOFING (proxy): the Shell proxy.ts does NOT currently do any
// language redirect, so these need no exemption today. If the Shell ever gains
// the L1-style locale-redirect proxy, these paths must be passed through
// untouched — exactly like fractera-easy-starter exempts /mcp-info, /api,
// /admin and /debug. Keep this list as the allowlist to wire in at that point.
// Do not add locale logic to proxy.ts until that decision is made.

export type SystemPage = {
  path: string
  label: string
  blurb: string
}

export const SYSTEM_PAGES: SystemPage[] = [
  { path: "/ai-core",      label: "AI Core",      blurb: "Live state of your AI entities" },
  { path: "/architecture", label: "Architecture", blurb: "Map of your app's pages" },
  { path: "/debug",        label: "Debug",        blurb: "Runtime diagnostics" },
]

// Paths a future locale-redirect proxy must pass through verbatim.
export const LOCALE_EXEMPT_PATHS: string[] = SYSTEM_PAGES.map(p => p.path)
