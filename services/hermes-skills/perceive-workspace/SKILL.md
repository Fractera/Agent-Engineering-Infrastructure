---
name: perceive-workspace
description: >
  See what is really on the owner's site before you act. Use whenever the owner asks about
  EXISTING things — "what do I have", "what pages / news do I have", "list my posts", "is there
  a blog already", "change this page", "delete that one". Call ONE tool, owner_perceive_workspace,
  and answer from what it shows you — the live site, not the deploy history and not memory. It is
  read-only (it changes nothing). Perceive first, then act.
version: 1.0.0
metadata:
  hermes:
    tags: [perceive, see, list, what, exists, state, content, news, blog, pages, sections, inventory, awareness, before, default]
    related_skills: [orchestrate-content-by-steps, manage-content-collections]
---

# perceive-workspace (Hermes)

These are your **eyes**. Whenever the owner asks about something that ALREADY exists — what they
have, what pages or news are on the site, whether a section exists, or to change or delete an
existing page — your FIRST move is to call **`owner_perceive_workspace`** and read the answer.
Then you act from THAT. You never answer from memory or from the deploy history.

## 🗣️ Talk to the OWNER in plain language only

The owner is **NOT a developer**. Don't expose internals (slug, scan, records). Just tell them
what's there: "You have 5 news posts: …", "There's no blog section yet."

## Why this matters (one trap to avoid)

If you answer "what news do I have" from the deploy history, you will UNDERCOUNT — a section made
in one publish shows as one entry, not one per page. The live tool shows every real page. So:

- **`owner_perceive_workspace` = what is REALLY on the site now.** Trust this. Your eyes.
- **The deploy history = what happened, not a list of content.** Never list pages from it.
- **Memory = can be out of date.** Check the live tool first.

## How to do it

1. The owner asks about existing content → call `owner_perceive_workspace` (optionally
   `scope: 'news'` to look at just one section).
2. Read the list it returns and answer the owner plainly.
3. If they then want to change or delete one of those pages, you now KNOW it exists — proceed with
   the right tool (`owner_content_orchestrate` / `manage-content-collections`).

## Never

- Never say "you have N pages" from the deploy history or from memory — look with the tool first.
- Never edit or delete a page you have not first SEEN in the live tool.

This is read-only and safe — it never changes anything. This capability ships to every agent; it
does not depend on you (Hermes) existing.
