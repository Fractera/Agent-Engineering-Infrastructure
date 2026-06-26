import type { ReactNode } from 'react'

// Stable anchor id for a heading, so a table of contents (used by the content
// pages) can link to it. Additive: headings simply gain an id, no visual change.
export function headingId(text: string): string {
  return text.toLowerCase().replace(/\*\*/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

// Dark-theme inline renderer for content prose: **bold** and [label](url).
// Outbound third-party links get rel="nofollow" (do not pass link weight); links
// to our own domain (fractera.ai) stay followed.
export function inline(text: string, kp: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[1] !== undefined) {
      nodes.push(<strong key={`${kp}-b${i}`} className="font-semibold text-white">{m[1]}</strong>)
    } else {
      const href = m[3]
      const external = /^https?:/.test(href)
      const ownDomain = /^https?:\/\/[^/]*fractera\.ai(\/|$)/i.test(href)
      const rel = external
        ? ownDomain
          ? 'noopener noreferrer'
          : 'noopener noreferrer nofollow'
        : undefined
      nodes.push(
        <a
          key={`${kp}-a${i}`}
          href={href}
          {...(external ? { target: '_blank', rel } : {})}
          className="font-medium text-violet-400 underline decoration-violet-400/40 underline-offset-2 hover:text-violet-300"
        >
          {m[2]}
        </a>,
      )
    }
    last = re.lastIndex
    i++
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}
