import type { ReactNode } from 'react'
import type { Block } from './types'
import type { PostBodyUi } from '@/lib/content/post-body-ui'
import { inline, headingId } from './inline'
import { AUTHOR, AUTHOR_SOCIAL_LINKS } from '@/lib/author'

// Block registry — one renderer per block `kind`; PostBody dispatches over this map.
// Container blocks recurse through `ctx.renderBlocks`, so any block nests in any
// layout. To add a section type: add a `kind` in ./types + one entry here.

export type BlockRenderCtx = {
  lang: string
  ui: PostBodyUi
  /** React key for this block's root element (also used as the inline key-prefix). */
  key: string
  /** Recursively render child blocks (used by container blocks). */
  renderBlocks: (blocks: Block[], lang: string, ui: PostBodyUi, keyPrefix?: string) => ReactNode[]
}

type BlockOf<K extends Block['kind']> = Extract<Block, { kind: K }>
type BlockRenderers = {
  [K in Block['kind']]: (block: BlockOf<K>, ctx: BlockRenderCtx) => ReactNode
}

const COLS_CLASS: Record<2 | 3, string> = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
}

export const BLOCK_RENDERERS: BlockRenderers = {
  h2: (b, { key: k }) => (
    <h2 key={k} id={headingId(b.text)} className="mt-6 scroll-mt-24 text-2xl font-bold tracking-tight text-foreground md:text-xl">
      {inline(b.text, k)}
    </h2>
  ),
  h3: (b, { key: k }) => (
    <h3 key={k} id={headingId(b.text)} className="mt-4 scroll-mt-24 text-lg font-semibold text-foreground">
      {inline(b.text, k)}
    </h3>
  ),
  p: (b, { key: k }) => (
    <p key={k} className="text-[17px] leading-8 text-muted-foreground md:text-base">
      {inline(b.text, k)}
    </p>
  ),
  quote: (b, { key: k }) => (
    <figure key={k} className="my-2 border-l-2 border-violet-500/60 bg-violet-500/[0.05] py-4 pl-6 pr-4">
      <blockquote className="text-xl font-medium leading-relaxed text-foreground md:text-lg">
        “{inline(b.text, k)}”
      </blockquote>
      {b.cite && (
        <figcaption className="mt-3 text-sm font-medium text-violet-300/80">{b.cite}</figcaption>
      )}
    </figure>
  ),
  list: (b, { key: k }) => (
    <ul key={k} className="flex list-disc flex-col gap-3 pl-6 text-[17px] leading-8 text-muted-foreground marker:text-violet-400 md:text-base">
      {b.items.map((it, j) => <li key={`${k}-${j}`}>{inline(it, `${k}-${j}`)}</li>)}
    </ul>
  ),
  olist: (b, { key: k }) => (
    <ol key={k} className="flex list-decimal flex-col gap-3 pl-6 text-[17px] leading-8 text-muted-foreground marker:font-semibold marker:text-violet-400 md:text-base">
      {b.items.map((it, j) => <li key={`${k}-${j}`} className="pl-1">{inline(it, `${k}-${j}`)}</li>)}
    </ol>
  ),
  figure: (b, { key: k }) => (
    <figure key={k} className="my-4 flex flex-col gap-3">
      {b.href ? (
        <a href={b.href} className="block overflow-hidden rounded-2xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.src} alt={b.alt} className="w-full" />
        </a>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={b.src} alt={b.alt} className="w-full rounded-2xl border border-border" />
      )}
      {b.caption && (
        <figcaption className="text-center text-sm text-muted-foreground/70">{inline(b.caption, `${k}-cap`)}</figcaption>
      )}
    </figure>
  ),
  cta: (b, { key: k }) => (
    <div key={k} className="my-4 flex flex-col gap-4 rounded-2xl border border-violet-500/30 bg-violet-500/[0.06] p-6">
      <p className="text-base font-medium text-foreground">{inline(b.text, k)}</p>
      <a
        href={b.href}
        className="inline-flex w-fit items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-500"
      >
        {b.label}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
      </a>
    </div>
  ),
  code: (b, { key: k }) => (
    <pre
      key={k}
      className="overflow-x-auto rounded-2xl border border-border bg-muted/40 p-5 text-[12.5px] leading-snug text-violet-200/80"
    >
      <code className="whitespace-pre font-mono">{b.text}</code>
    </pre>
  ),
  note: (b, { key: k }) => (
    <p key={k} className="mt-2 border-t border-border pt-6 text-sm italic leading-relaxed text-muted-foreground/70">
      {inline(b.text, k)}
    </p>
  ),
  founder: (b, { key: k }) => (
    <figure key={k} className="my-6 flex flex-col items-center rounded-2xl border border-border bg-muted/40 px-6 py-10">
      <blockquote className="max-w-[640px] text-center">
        <p
          className="bg-clip-text text-center text-[22px] font-medium leading-snug tracking-tight text-transparent md:text-xl"
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(167,139,250,0.35) 0%, rgba(167,139,250,0.95) 25%, #a78bfa 50%, rgba(167,139,250,0.95) 75%, rgba(167,139,250,0.35) 100%)',
          }}
        >
          {inline(b.text, k)}
        </p>
      </blockquote>
      <figcaption className="mt-7 flex flex-col items-center gap-4">
        <div className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={AUTHOR.photo} alt={`${AUTHOR.name} photo`} width={32} height={32} className="mr-2.5 rounded-full" />
          <span className="text-base font-light tracking-tight text-muted-foreground">
            <a href={AUTHOR.url} rel="author me" className="hover:text-foreground">{AUTHOR.name}</a>
            <cite className="ml-1.5 not-italic text-muted-foreground/70 before:mr-1.5 before:inline-flex before:h-px before:w-4 before:bg-muted-foreground/50 before:align-middle">
              {AUTHOR.role}
            </cite>
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground/70">
          {AUTHOR_SOCIAL_LINKS.map(s => (
            <a key={s.href} href={s.href} target="_blank" rel="me author noopener noreferrer" className="hover:text-violet-300">
              {s.label}
            </a>
          ))}
        </div>
      </figcaption>
    </figure>
  ),
  callout: (b, { key: k }) => (
    <aside key={k} className="my-6 flex gap-4 rounded-2xl border border-sky-400/30 bg-sky-400/[0.06] p-5">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-sky-300" aria-hidden>
        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
      </svg>
      <p className="text-[15px] leading-relaxed text-muted-foreground">
        <span className="font-semibold text-sky-200">{b.title} </span>
        {inline(b.text, k)}
      </p>
    </aside>
  ),
  table: (b, { key: k }) => {
    const lastCol = b.headers.length - 1
    return (
      <figure key={k} className="my-6 overflow-x-auto rounded-2xl border border-border">
        {b.caption && (
          <figcaption className="border-b border-border bg-muted/40 px-5 py-3 text-sm font-semibold text-muted-foreground">
            {inline(b.caption, `${k}-cap`)}
          </figcaption>
        )}
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {b.headers.map((h, ci) => (
                <th
                  key={ci}
                  scope="col"
                  className={`px-4 py-3 align-bottom font-semibold ${ci === lastCol ? 'bg-violet-500/[0.08] text-violet-200' : 'text-foreground/80'}`}
                >
                  {inline(h, `${k}-h${ci}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border last:border-0">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`px-4 py-3 align-top leading-relaxed ${
                      ci === 0
                        ? 'font-medium text-foreground/80'
                        : ci === lastCol
                          ? 'bg-violet-500/[0.05] text-violet-100'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {inline(cell, `${k}-r${ri}c${ci}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    )
  },
  docref: (b, { key: k, ui }) => (
    <aside key={k} className="my-6 flex flex-col gap-4 rounded-2xl border border-violet-500/30 bg-violet-500/[0.05] p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-400/70">
          {b.kicker ?? ui.fullDocumentation}
        </p>
        <p className="text-base font-semibold text-foreground">{b.title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{inline(b.summary, k)}</p>
      </div>
      <a
        href={b.href}
        download
        className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-500"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" /></svg>
        {b.label ?? ui.downloadMd}
      </a>
    </aside>
  ),

  // ── Container blocks (recursive) ───────────────────────────────────────────
  columns: (b, ctx) => (
    <div key={ctx.key} className={`my-4 grid gap-6 ${COLS_CLASS[b.cols ?? 2]}`}>
      {ctx.renderBlocks(b.children, ctx.lang, ctx.ui, ctx.key)}
    </div>
  ),
  group: (b, ctx) => (
    <div key={ctx.key} className="flex flex-col gap-6">
      {ctx.renderBlocks(b.children, ctx.lang, ctx.ui, ctx.key)}
    </div>
  ),
}

// Dispatch a single block to its registered renderer.
export function renderBlock(block: Block, ctx: BlockRenderCtx): ReactNode {
  const render = BLOCK_RENDERERS[block.kind] as (b: Block, c: BlockRenderCtx) => ReactNode
  return render(block, ctx)
}

// Render an ordered list of blocks. `keyPrefix` keeps keys unique across nesting levels.
export function renderBlocks(
  blocks: Block[],
  lang: string,
  ui: PostBodyUi,
  keyPrefix = 'blk',
): ReactNode[] {
  return blocks.map((b, i) =>
    renderBlock(b, { lang, ui, key: `${keyPrefix}-${i}`, renderBlocks }),
  )
}
