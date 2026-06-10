// Project layer (ARCHITECTURE §3.12). A project is an independent line of work
// the same agent/workspace runs — a site, a procurement tracker, a language
// course, a sales automation. The "default" project holds everything today.
export type Project = {
  id: string
  name: string
  slug: string | null
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
