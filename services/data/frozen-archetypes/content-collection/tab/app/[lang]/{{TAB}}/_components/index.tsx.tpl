import type { Metadata } from 'next'
import { buildAlternates } from '@/lib/seo/alternates'
import { BRAND } from '@/lib/brand'
import { get{{TAB_PASCAL}}Ui } from '../_data'
import { {{TAB_CAMEL}}List } from '../_lib/post'
import { POSTS } from '../_list.generated'

// FROZEN ARCHETYPE TEMPLATE — content-collection. Entry for the /{{TAB}} router
// page (the index where a visitor picks an article). Standard router shape:
// page.tsx is thin and re-exports this. The post list is auto-discovered: POSTS
// comes from _list.generated.ts (built by parser-fs from the co-located post
// folders); {{TAB_CAMEL}}List aggregates + localizes it.

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const ui = get{{TAB_PASCAL}}Ui(lang)
  return {
    title: ui.metaTitle,
    description: ui.metaDescription,
    alternates: buildAlternates(lang, '/{{TAB}}'),
  }
}

function formatDate(iso: string, lang: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(lang, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default async function {{TAB_PASCAL}}Index({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const ui = get{{TAB_PASCAL}}Ui(lang)
  const items = {{TAB_CAMEL}}List(POSTS, lang) // localized title + summary, from each post's _data

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: BRAND.name, item: `${BRAND.siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: ui.breadcrumb, item: `${BRAND.siteUrl}/${lang}/{{TAB}}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-20 md:py-14">
          <header className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-widest text-violet-400/70">{ui.eyebrow}</p>
            <h1 className="text-4xl font-bold tracking-tight md:text-3xl">{ui.indexTitle}</h1>
            <p className="max-w-2xl text-base text-white/50">{ui.indexIntro}</p>
          </header>

          {/* Flat vertical list — date + title + summary, no images, no columns. */}
          <ul className="flex flex-col divide-y divide-white/10 border-y border-white/10">
            {items.map(item => (
              <li key={item.slug}>
                <a
                  href={`/${lang}/{{TAB}}/${item.slug}`}
                  className="group flex flex-col gap-1.5 py-5 transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <time dateTime={item.date}>{formatDate(item.date, lang)}</time>
                    <span aria-hidden>·</span>
                    <span>{item.readingMinutes} {ui.minRead}</span>
                  </div>
                  <h2 className="text-lg font-semibold leading-snug text-white group-hover:text-violet-300">
                    {item.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-white/50">{item.summary}</p>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  )
}
