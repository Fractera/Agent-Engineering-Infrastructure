# TROUBLESHOOTING.md — what goes wrong in production

**Load this file only when something is actually wrong.** Not at session start. It answers questions of one
shape: *"it worked while I was building it, and on the real server it does not"* — pages that do not open,
buttons that are missing, a screen that hangs, something visible to you but not to your users.

Everything here is a **cause**, not a guess. When you diagnose a new one, add it: same three parts —
symptom, cause, fix.

---

## Everything works in development; in production the buttons are gone

**Symptom.** While developing you see every page and every menu item, and nothing is restricted. On the
real server the links still work if you type them, but the buttons that lead there are not rendered — or a
page refuses to open at all.

**Cause: the role of the person looking at the page, not a bug.**

In development the agent runs with authorization bypassed — the developer is handed every role at once, so
every protected page and every menu item is visible. That is deliberate: it keeps local work from turning
into a login exercise. The side effect is that **role-based access cannot be tested locally at all** —
locally you are always allowed.

In production the visitor gets exactly the rights their account carries. Nothing is granted for being the
owner: **an architect can genuinely fail to see a page built for a manager**, because the page asks for the
manager role and the architect does not have it. What you are seeing is the access rule working, not the
page breaking.

**Fix.** Give the account that is viewing the page the roles that page requires. Roles are assigned in the
control panel, and the same table drives which menu items appear — set the role there and the button
returns with it.

**How to confirm it in one move.** Open the same page as an account that has the role. It appears → this
was access, and there is nothing to fix in the code. It is still missing → the cause is elsewhere, keep
looking.

---

## Before you blame the code

Two checks that resolve most "it does not work on the server" reports faster than reading anything:

**Is the running build the build you think it is?** Changes reach the server through a deployment. Until
one has run, the server is honestly serving the previous version, and every symptom you are chasing
belongs to that older code.

**Is it a setting rather than code?** The app's name, description, branding, SEO and analytics come from
the panel, not the repository (`npm run read:app-config`). A value that "will not change no matter what I
edit" is almost always this: the file the app reads is not the file you edited.

---

*Add a case when you diagnose one — symptom, cause, fix, in that order. A case written from the symptom
alone is worse than nothing: the next session will follow it into the wrong place.*

## The two commands

This document has two, and they are not variants of one another — one reads it, the other writes it. Both
are listed in the instruction-set block of `CLAUDE.md`.

**"Why" — find the real cause.** The owner is looking at something that behaves wrongly on the live
server. Load this file, look for the symptom, and answer with the CAUSE, not with a guess dressed as one.

- If the symptom is here, say which entry matches and what the fix is.
- If it is not, say so plainly, diagnose it properly — and **write the new entry** once you know the
  cause. Symptom, cause, fix, in that order.
- Never answer this command from memory of a similar project. A cause that was true elsewhere is a
  hypothesis here, and this document exists because hypotheses cost days.

**"Difficulties may arise here" — record the expectation.** The owner is pointing at a place he expects
to break. Write it down: what the place is, what he expects to go wrong, and what would confirm it. Mark
it as *expected*, not observed — the difference matters, because an expectation that never materialised
must be deletable without arguing about it.

Then say back, in one line, what you recorded — the same restatement rule as everywhere else.

**Near-variants count.** Both are spoken: *"why is this happening"*, *"почему"*, *"тут будут проблемы"*,
*"здесь могут возникнуть трудности"* — one request each.
