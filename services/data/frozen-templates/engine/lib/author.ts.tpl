// Author/founder identity, used by the founder block and the article JSON-LD author.
// Placeholder — replace with the real author. Keep `sameAs` EMPTY until you add the
// author's own profile URLs (never ship someone else's). Photo is a placeholder.
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
