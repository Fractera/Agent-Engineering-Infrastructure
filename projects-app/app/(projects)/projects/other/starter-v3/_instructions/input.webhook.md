# CHANNEL `webhook` — an external system pushes work in over HTTP

**Function:** `receiveWebhook` (derived). **Keys:** none by default; a shared secret when the sender supports one.

A door for machines. Someone else's system decides when work arrives; this automation only receives.

## What its function does

Takes the HTTP envelope and normalises the payload into the shape the automation consumes. The envelope's
shape belongs to the sender, so the mapping lives HERE and nowhere downstream — that is what keeps a second
sender from rippling through the whole graph.

## What it must never do

- **Never poll.** The event is PUSHED. A scheduled fetch of your own input is a defect here, not a
  convenience.
- **Never trust shape.** A malformed envelope throws; the failure belongs to a failure branch, not to a
  quietly empty result.
- **Never authenticate by session.** A machine has no cookie. If the sender can sign its calls, verify the
  signature — the email channel does exactly this and is the pattern to copy.

## When to reveal it

When another system must start this automation. If a human starts it, that is a different channel.
