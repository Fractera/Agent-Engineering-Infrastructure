# Rules for robots: what is already built

Your site is visited by more than people. Search crawlers arrive, models arrive —
and the first thing each of them asks for is one file: `/robots.txt`. It is the
only place where you speak to them before they have read anything.

## What it already says

**Every robot gets its own rule, not one rule for all.** By name: `Googlebot`,
`Bingbot`, `GPTBot` and `OAI-SearchBot` (OpenAI), `ChatGPT-User`, `anthropic-ai`
and `ClaudeBot`, `PerplexityBot`, plus a general rule for everyone else.

**Machinery is closed.** Internal addresses (`/api`), build files (`/_next`) and
working sections stay out of search — not because they are secret, but because a
robot that spent its crawl on them never reached your pages.

**The sitemaps are declared right here.** A robot learns about them from the very
first file it opens instead of guessing.

**The crawl pace is set** where robots honour it: they arrive more calmly and the
crawl does not turn into load on your server.

## Why this deserves its own conversation

Models now arrive more often than search engines, and the decision about them is
yours, not a technical detail. Blocking `GPTBot` means disappearing from the
answers people get instead of searching. Allowing it means letting your text be
retold. The product ships **open**: a site nobody can talk about is invisible
twice over.

The file builds itself from the site address and its settings. There is nothing
to maintain by hand.

## The honest boundary

`robots.txt` is a request, not a lock. Well-behaved robots respect it,
ill-behaved ones ignore it, and that is true everywhere. Anything that must truly
be closed is closed by authorization — the project has it, and it works
independently of this file.
