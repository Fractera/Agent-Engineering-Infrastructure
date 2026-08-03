# DESTINATION `toast` — the DEFAULT destination, and the one door that cannot be shut

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

**Function:** `deliverToast` (derived). **Keys:** none.

Every other destination is optional: the builder reveals the ones his automation needs. This one is not.
It carries the OUTCOME of a run — success and failure alike — to the one place that always exists: the
automation's own page and its run journal.

## 🔒 THE DEFAULT DESTINATION — every notification, not only a run outcome

**Anything this automation has to tell the human goes out through a connected channel; when NO channel is
connected or active, it goes to the toast. "Nobody was told" is not an expressible state.**

That covers more than a run: a due calendar moment, and every future path that notifies. Whoever builds
such a path declares its fallback here — a notification whose only channel is missing is a DEFECT, not a
configuration. The rule is narrow on purpose: the fallback fires when there is NO active channel at all.
A channel that exists and FAILED must retry on the next beat, never be replaced by "well, we toasted it".

Exactly-once is the same mark the outward channels use (`deliveredAt` in the entry), so a repeated beat
never repeats the toast.

**The CANVAS does not change, and that is correct.** A deferred announcement is not a graph run — it has
its own door (`tab.calendar.md` §4), so it draws no node and no edge. What it does is CALL THIS NODE'S
FUNCTION (`deliverToast`) with the moment as its context: one writer of the toast journal, two callers.
Never write a toast row by hand from anywhere else — that is how one behaviour gets two homes.

Proven live 2026-08-03: a due entry with no connected channel produced `due 1 · sent 0` — the moment came
and no one was told. That silence is what this section removes.

## Why it exists

Until this channel, the failure branch had a FORBIDDEN outgoing port. A run that failed reached no output
at all: the human learned neither what happened nor why. The silence looked exactly like success.

So the law changed in two places at once: the failure branch now leads into an output, and this channel
cannot be hidden while the automation is a real project. **An automation able to fail silently is no longer
expressible.**

## What its function does

Writes one row — the outcome named by the last validator, the reason the nodes left in the context, the
title, the source and the moment. Nothing is composed here: the outcome and the reason already exist,
this door only makes them visible.

## The honest boundary — read this before promising more

A toast lives on the automation's OWN surface. For a run that arrived from a bot, an inbox or a schedule,
the person is not looking at that surface, and this channel does not pretend otherwise: it guarantees that
the outcome is RECORDED and visible in place, not that it was delivered to wherever the human is. Telling
that human belongs to the channel he wrote from.

Stating this plainly is deliberate. A guarantee that quietly does not hold is worse than none.

## What it must never do

- **Never be hidden.** The schema refuses a real project whose toast is not visible.
- **Never compose an answer.** It reports an outcome; the reply belongs to the route.
- **Never swallow the reason.** An outcome without its reason is half a report — «failed» with no «why»
  sends the owner reading logs, which is what this channel exists to prevent.
- **Never duplicate the run journal.** The journal is the machine's trace; the toast is what a human reads.

## When to reveal it

It is revealed by law, not by choice — as long as the automation is a real project.
