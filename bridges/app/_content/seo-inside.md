# Search optimisation: what is already built

This is not a list of intentions. Everything below is in your project and runs on
every page. The short version: the search side is done, and you do not need to
touch it.

## 1. Pages arrive as finished HTML

Every public page is **built ahead of time** and reaches the visitor as a complete
document — not an empty shell that assembles itself in the browser, but text that
is there immediately, including with JavaScript switched off.

This is the part that AI-written projects lose most often: pages quietly turn
dynamic, every visit recomputes them, the server carries the load, and the search
engine sees a slow answer. Here it is forbidden at the architecture level, and
pages refresh on a schedule (ISR) instead: the content stays fresh while the work
per request stays at zero.

What that means in money: **traffic growth does not raise your server bill**.
Serving a prepared file costs about the same at a hundred visits and at a hundred
thousand.

## 2. One builder produces every meta tag

Title, description, keywords, author, canonical address, the social card
(OpenGraph), the X/Twitter card, indexing permission, Google and Yandex
verification — all of it is built by **one** mechanism from your settings.

Why this matters more than it sounds: meta tags written by hand per page cover the
fields somebody remembered. Six months later half the pages hand social networks
the wrong image and the site's description instead of the page's.

Descriptions are trimmed to 160 characters automatically — beyond that the search
engine cuts them anyway, and it cuts mid-word.

## 3. Language signals

- `<html lang="…">` — per page, in that page's language. It is what tells a screen
  reader how to read and a search engine what language it is looking at.
- **Canonical address** — every page declares itself, not its neighbour.
- **`hreflang`** — the list of this page's translations, including `x-default` for
  a visitor whose language you do not carry.
- Five values (name, description, title template, keywords, site name) are read
  **in the page's language** rather than one set for the whole site.

The mistake these three lines prevent is the most expensive one in a multilingual
project: without them a search engine treats translations as **copies of each
other**, picks one and keeps the rest out of results. The site works, the pages
open, and half your languages are simply absent from search.

## 4. Structured data (JSON-LD)

The project hands search engines a machine-readable description of itself:

| What is described | Type |
|---|---|
| The site | `WebSite` |
| The organization | `Organization` (+ contacts) |
| A local business | `LocalBusiness` (+ address, coordinates) |
| Breadcrumbs | `BreadcrumbList` |
| Questions and answers | `FAQPage` |
| A product | `Product` + `Offer` (price, availability) |
| News / article / document | `NewsArticle` / `BlogPosting` / `TechArticle` |

An article also carries its author as a **person**, with links to their profiles,
a publisher with a logo, dates, and the page's own address. This is what rich
results grow from — stars, prices, expandable questions.

## 5. Sitemap and robots

- `sitemap.xml` — the pages whose number is finite.
- Products live in **separate, chunked maps**: one file holds at most 50 000 URLs,
  and past that a search engine discards the file entirely, pages included. Nearly
  every growing catalogue walks into this trap.
- `robots.txt` — assembled from your settings, announcing every map at once.

## 6. Links inside articles are machine-checked

Articles use two kinds of link: external ones always carry a full address, open in
a new tab, and get `nofollow` on third-party domains; the internal one points at
the home page in that article's own language. `npm run check:content` enforces it,
and material that breaks a rule does not pass.

## What is left for you

Fill in the application settings: name, description, site address, social image,
icons. Everything listed above switches itself on.
