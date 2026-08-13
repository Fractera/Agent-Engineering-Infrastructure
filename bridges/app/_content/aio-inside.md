# AI optimisation: what is already built

Everyone knows about search optimisation. This part is about the reader people
remember last and who is already arriving today: **the model**.

The difference between them is single and decisive. A search engine sends a
person to your page. A model comes itself, reads, and **retells** — in its own
words, to whoever asked. If it finds nothing to read, it retells a competitor.

## Why a page is awkward for a machine

A model opening an ordinary page parses it together with the menu, the footer, the
consent banner, the scripts and the styling markup. Half of what it read has
nothing to do with your content — and that half takes space it does not have much
of.

## What your project serves

**`/llms.txt` — a site map for models.** Name, short summary, and a list of
sections with links: pages, articles, the catalogue, legal documents in a separate
"may be skipped" section. One map per language.

**`/llms-full.txt`** — the full text of those same pages in one document.

**A markdown twin for every page.** Beside the ordinary address lives a machine
one: clean text, no menu, no scripts. The ordinary page links to it, so the model
finds it by itself.

## Why it cannot drift from the site

The machine version is built **from the same data** as the page. Not a copy — a
second view of one thing: change the text and both change.

A hand-written "file for AI" would drift from the site on the first edit, and
nobody would notice: such files are never opened in a browser.

## Honest about the format

`llms.txt` is a proposed standard with a specification (llmstxt.org), and our file
follows it: heading, a blockquote summary, sections of links. `llms-full.txt`,
however, **is not in the specification** — it is a community convention. We
support it and call it what it is, rather than "the standard".

## What is left for you

Nothing. A new article enters the map and gets its machine version by itself —
both come from the same list of pages. Forgetting is impossible: the check refuses
a page without its machine version.
