// FROZEN ENGINE (decoupled from FES). Canonical content-block catalog — the single
// source of truth for every block kind a content page can use. Authoring a page =
// writing data with these blocks; rendering = the registry in ./registry.tsx maps
// each `kind` to a renderer. Adding a new section type = add a member here + a
// renderer in the registry, nothing else.
//
// Inline markup inside text fields supports **bold** and [label](url) (see
// ./inline.tsx). This file intentionally has NO imports so the catalog stays a leaf
// of the import graph.
//
// NOTE (decoupling): FES-only `frameworks` (framework grid) and `inquiry` (company
// brain CTA) kinds were removed — re-add a kind here + a renderer in ./registry.tsx
// to extend the catalog for your project.

// ── Leaf blocks ──────────────────────────────────────────────────────────────
export type LeafBlock =
  | { kind: 'p'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'quote'; text: string; cite?: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'olist'; items: string[] }
  | { kind: 'figure'; media: 'image' | 'video'; src: string; alt: string; caption?: string; href?: string }
  | { kind: 'code'; text: string }
  | { kind: 'cta'; text: string; href: string; label: string }
  | { kind: 'note'; text: string }
  // Founder pull-quote (gradient-violet text + author photo/name/role + social
  // links). Author defaults to the site founder (lib/author).
  | { kind: 'founder'; text: string }
  // Reference card to a full raw document with a download button. title + one-line
  // summary + file. Optional `label` overrides the download-button text; optional
  // `kicker` overrides the eyebrow above the title.
  | { kind: 'docref'; title: string; summary: string; href: string; label?: string; kicker?: string }
  // "Did you know" callout — icon + tinted panel for an aside fact. title is the lead-in.
  | { kind: 'callout'; title: string; text: string }
  // Comparison table — static, no-JS. `headers` is the column row (first column is
  // the row label); `rows` are the body rows. The LAST column is emphasized. Cells
  // support inline markup. Optional `caption` above the table.
  | { kind: 'table'; headers: string[]; rows: string[][]; caption?: string }

// ── Container blocks (composite layouts) ─────────────────────────────────────
// Containers hold `children: Block[]` and render recursively through the same
// registry, so ANY block (including another container) nests inside ANY layout.
export type ContainerBlock =
  | { kind: 'columns'; children: Block[]; cols?: 2 | 3 }
  | { kind: 'group'; children: Block[] }

export type Block = LeafBlock | ContainerBlock

export type FaqPair = { q: string; a: string }
