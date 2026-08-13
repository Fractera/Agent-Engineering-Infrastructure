# Sitemap: what is already built

A search engine finds pages two ways: by following links, and by reading a
sitemap. The first is slow and guarantees nothing — a page nobody has linked to
yet can wait for months. The sitemap is the list you hand over at once.

## What it already contains

**Home, catalogue, blog and every article — in each enabled language.** Enable a
second language and the map doubles by itself.

**Articles carry their modification date.** The search engine sees what changed
and does not spend its crawl on what did not.

**The catalogue lives in its own map, split into chunks.** The reason is
technical and hard: one file holds 50,000 addresses, and past that limit a search
engine discards the file ENTIRELY — pages and articles along with it. Products
grow at runtime and multiply by language, so their set is kept apart from the
authored one.

## What it leaves out — on purpose

**Pages behind authorization.** Account, panel, checkout, sign-in and
registration never enter the map. Such a page is different for every visitor, it
does not exist at build time, and a crawler would receive a login form. Promising
a search engine an address where a lock awaits it wastes the crawl and fills your
reports with errors instead of pages.

**Machinery addresses.** Those are closed in the robots rules; the map and the
rules say the same thing rather than contradicting each other.

## Why the map cannot drift from the site

Its addresses are built by **the same code** as the pages' canonical addresses.
That is not a detail: when a site has one language the language segment
disappears from the address — and a separately assembled map would point at
redirects. A map made of redirects devalues itself.

The article list comes from the same inventory that feeds the blog page. A new
article enters the map by the fact of existing.

## What is left for you

Nothing. A check refuses a section that appears in no map — caught on a live
project, where the blog was written, translated and open, and absent from the
map.
