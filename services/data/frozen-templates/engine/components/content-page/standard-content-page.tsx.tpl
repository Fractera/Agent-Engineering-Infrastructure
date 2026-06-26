import type { ReactNode } from 'react'
import type { Block, FaqPair } from '@/lib/content/blocks/types'
import { AUTHOR } from '@/lib/author'
import { getPageUi } from '@/lib/content/page-ui'
import { PostBody, headingId } from './post-body'

// StandardContentPage — the one reusable template for every content page/post; a
// route only supplies data. Renders, in order:
//   1. Breadcrumbs (visible)             5. body blocks (H2/H3/quote/list/…)
//   2. Max-size H1 + subtitle + byline   6. `sections` slot (injected by the route)
//   3. Hero image / custom hero          7. FAQ (last content section)
//   4. Table of contents (from H2s)      8. Back link (ABSOLUTE LAST, below FAQ)
// Project-specific sections go through the open `sections` slot. Fully server-
// rendered — readable with JS off.

export type Breadcrumb = { label: string; href?: string }

export type StandardContentPageProps = {
  lang: string
  /** Ordered breadcrumb trail; the LAST item is the current page (no href). */
  breadcrumbs: Breadcrumb[]
  tags?: string[]
  /** H1 — rendered at the homepage hero's maximum size. */
  title: string
  subtitle?: string
  author?: { name: string; role: string; url?: string }
  /** Byline override (createContentPost renders author · date · reading time). */
  metaLine?: ReactNode
  heroImage?: string
  heroAlt?: string
  /** Hero override (post video / responsive picture); replaces heroImage. */
  hero?: ReactNode
  blocks: Block[]
  faq?: FaqPair[]
  /** Back link target — one level up from the current page. */
  backHref: string
  backLabel: string
  /**
   * Open slot for project-discretion sections (injected by the route entry),
   * rendered directly ABOVE the FAQ. May be one section, several, or none.
   */
  sections?: ReactNode
}

export function StandardContentPage({
  lang,
  breadcrumbs,
  tags,
  title,
  subtitle,
  author = { name: AUTHOR.name, role: AUTHOR.role, url: AUTHOR.url },
  metaLine,
  heroImage,
  heroAlt,
  hero,
  blocks,
  faq,
  backHref,
  backLabel,
  sections,
}: StandardContentPageProps) {
  const ui = getPageUi(lang)

  // Table of contents — from the H2 sections, labels AND anchors matching PostBody.
  const toc = blocks
    .filter((b): b is { kind: 'h2'; text: string } => b.kind === 'h2')
    .map(b => ({ id: headingId(b.text), text: b.text.replace(/\*\*/g, '') }))

  return (
    <main className="min-h-screen bg-black text-white">
      <article className="mx-auto w-full max-w-5xl px-6 py-16 md:py-12">

        {/* 1. Breadcrumb — single row, never wraps, never overflows. */}
        <nav aria-label="Breadcrumb" className="text-sm text-white/40">
          <ol className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden">
            {breadcrumbs.map((c, i) => {
              const isLast = i === breadcrumbs.length - 1
              return (
                <li
                  key={i}
                  className={`flex items-center gap-1.5 ${isLast ? 'min-w-0' : 'shrink-0'}`}
                >
                  {c.href && !isLast ? (
                    <a href={c.href} className="whitespace-nowrap hover:text-white">{c.label}</a>
                  ) : (
                    <span aria-current="page" className="block min-w-0 truncate text-white/60">{c.label}</span>
                  )}
                  {!isLast && <span aria-hidden className="shrink-0 text-white/25">/</span>}
                </li>
              )
            })}
          </ol>
        </nav>

        {/* 2. Header — tags + max-size H1 + subtitle + author/byline */}
        <header className="mt-6 flex flex-col gap-5 border-b border-white/10 pb-8">
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {tags.map(t => (
                <span key={t} className="rounded-full border border-violet-500/30 bg-violet-500/[0.06] px-3 py-1 text-xs font-medium text-violet-300">
                  {t}
                </span>
              ))}
            </div>
          )}
          <h1
            className="text-3xl font-bold font-serif leading-tight tracking-tight md:text-4xl lg:text-5xl"
            style={{
              color: 'white',
              WebkitTextStroke: '1px rgba(139,92,246,0.8)',
              paintOrder: 'stroke fill',
              textShadow: '0 0 18px rgba(139,92,246,0.55), 0 0 36px rgba(139,92,246,0.28)',
            } as React.CSSProperties}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg leading-relaxed text-white/55 md:text-base">{subtitle}</p>
          )}
          {metaLine ?? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/40">
              {author.url ? (
                <a href={author.url} rel="author" className="hover:text-white">{author.name}</a>
              ) : (
                <span>{author.name}</span>
              )}
              <span aria-hidden>·</span>
              <span>{author.role}</span>
            </div>
          )}
        </header>

        {/* Hero — custom node overrides the default image hero. */}
        {hero ?? (heroImage && (
          <figure className="my-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt={heroAlt ?? title}
              loading="eager"
              className="w-full rounded-2xl border border-white/10"
            />
          </figure>
        ))}

        {/* 3. Table of contents */}
        {toc.length > 0 && (
          <nav aria-label="Contents" className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400/70">
              {ui.tocHeading} · {toc.length}
            </p>
            <ol className="mt-3 flex flex-col gap-2">
              {toc.map((item, i) => (
                <li key={item.id} className="flex gap-3 text-[15px] leading-snug">
                  <span aria-hidden className="select-none font-mono text-sm text-white/30">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <a href={`#${item.id}`} className="text-white/65 transition-colors hover:text-violet-300">
                    {item.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* 4. Body blocks */}
        <PostBody blocks={blocks} lang={lang} />

        {/* Open sections slot — project-specific sections injected by the route entry. */}
        {sections}

        {/* FAQ — the last CONTENT section by contract; only the back link sits below it. */}
        {faq && faq.length > 0 && (
          <section aria-labelledby="faq-heading" className="mt-12 border-t border-white/10 pt-10">
            <h2 id="faq-heading" className="text-2xl font-bold tracking-tight">{ui.faqHeading}</h2>
            <dl className="mt-6 flex flex-col gap-4">
              {faq.map((f, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                  <dt className="text-base font-semibold text-white">{f.q}</dt>
                  <dd className="mt-2 text-[15px] leading-relaxed text-white/60">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Back link — the ABSOLUTE LAST item on every content page (below the FAQ). */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <a href={backHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-400 hover:text-violet-300">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {backLabel}
          </a>
        </div>

      </article>
    </main>
  )
}
