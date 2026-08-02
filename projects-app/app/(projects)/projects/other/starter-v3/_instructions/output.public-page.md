# DESTINATION `public-page` — the result goes onto the public surface

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

**Function:** `deliverPublicPage` (derived). **Keys:** none.

What this automation publishes for people who are not its owner. The page's address lives in
`passport.publicUrl`, and the automation answers "where can I see this?" from there.

## What its function does

Puts the result into the shape the public surface renders and marks it published.

## What it must never do

- **Never publish what the owner did not mean to publish.** A run may pass through here carrying a private
  record; what is public is decided by the passport's access tier, not by the fact that a route reached this
  door.
- **Never publish secrets, keys, or another person's data** — the public page is the widest possible
  audience, and there is no unpublishing that anybody believes.
- **Never assume the page exists.** An empty `publicUrl` means not yet assigned, and the automation says so
  honestly rather than inventing a link.

## When to reveal it

When the automation is genuinely meant to be read by strangers. It is the one destination whose mistakes
cannot be taken back.
