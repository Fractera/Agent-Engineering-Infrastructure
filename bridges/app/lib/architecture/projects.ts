// Project layer (ARCHITECTURE §3.12, repositioned step 174). Projects are
// independent application levels that provide technical tools, business
// solutions and logic for PRIVATE use by the architect or a project
// administrator. Unlike pages (open to any role), projects are restricted to
// service needs. Four fixed categories: automation · fractera-pages ·
// personal · other. Fractera agents do not run an automation once per request —
// they build a platform for REPEATABLE automations (visual UI, local DB +
// vector memory, one-click reuse): "an n8n for one single task".
// The "default" project holds everything today.
export type Project = {
  id: string
  name: string
  slug: string | null
  description?: string | null
  created_at?: string
}

export const DEFAULT_PROJECT = "default"

// Naming standard: at least three words, kebab-case slug. Longer, specific names
// cut collisions and search-ambiguity for the agent (a one-word "sales" matches
// everything). "default" is the reserved exception.
export function wordCount(name: string): number {
  return name.trim().split(/\s+/).filter(Boolean).length
}

export function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60)
}
