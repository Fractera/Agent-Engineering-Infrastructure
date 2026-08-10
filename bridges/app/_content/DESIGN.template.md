# DESIGN.md — how the pages should look

**Given, not evolving.** You write this; the agent obeys it.

Describe the look once and every page inherits it. Without this file the agent invents an appearance
per page, and you review visual decisions after they are built instead of before.

## What to write here

- **Tone** — what this product should feel like in three or four words, and what it must never feel like.
- **Colour and type** — the accent, the surfaces, the font pairing. Name them; "modern and clean"
  cannot be implemented.
- **Spacing and density** — airy or compact, and where the exceptions live.
- **Components you insist on** — the shape of buttons, cards, tables, forms; what a page header carries.
- **References** — a link or a screenshot of something you like, with one sentence on WHAT you like in
  it. The sentence matters more than the link.

## For the agent

Read this before building any user-facing surface. If the request contradicts this file, say so in one
sentence before writing code: either the request is an exception worth recording here, or the document
is out of date. Do not silently pick one.
