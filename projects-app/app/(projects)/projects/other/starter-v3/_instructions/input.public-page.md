# CHANNEL `public-page` — a stranger, from the public surface

**Function:** `receivePublicPage` (derived). **Keys:** none.

Work sent from the automation's public page by someone who is NOT the owner. That single fact changes how
the whole run must be treated.

## What its function does

Normalises the public form's payload and marks the source as public, so the route can tell an owner's
message from a stranger's.

## What it must never do

- **Never assume the owner.** Whatever arrives here is untrusted input from an unknown person.
- **Never expose what the owner sees.** A run from here must not read the owner's stores wholesale — what
  the public surface may show is decided by the passport's access tier, not by this door.
- **Never let it reconfigure the automation.** "From now on…" arriving from a stranger is not a control
  request; the front's classes and the access tier exist for exactly this.

## When to reveal it

When the automation is meant to serve people other than its owner. Until then it stays hidden: an open
public door on an unpublished automation is a liability, not a feature.
