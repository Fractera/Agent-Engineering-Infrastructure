// FROZEN ENGINE (decoupled from FES). Single source of truth for the author/founder
// identity, reused by the founder block (post-body) and the per-article JSON-LD
// author (Person). GENERIC placeholder identity — replace with the site's real
// author. `sameAs` is the SEO "glue" that consolidates the author's real profiles
// into ONE entity; keep it EMPTY until you add the real profiles (do not ship
// someone else's profile links). The author photo points at a shipped placeholder.

export const AUTHOR = {
  name: 'Site Author',
  role: 'Editor',
  photo: '/placeholders/author.svg',
  url: '/',
  id: '#site-author',
} as const

// Real social/profile URLs of the author — fill these in; each one is added to the
// JSON-LD `sameAs` so search engines consolidate the author into a single entity.
export const AUTHOR_SAME_AS: string[] = []

// A compact, labelled subset shown under the founder quote (rel="me author").
export const AUTHOR_SOCIAL_LINKS: { label: string; href: string }[] = []
