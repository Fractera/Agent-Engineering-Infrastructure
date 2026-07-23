# TAB `calendar` — the automation's own schedule

WHAT IT IS. A read surface over the output rows of table `calendar`: a month grid on the left, a
30-minute day planner on the right. It creates nothing by hand — entries arrive the way every other
row arrives, from the output door of a run.

AN ENTRY is one row: `date` "YYYY-MM-DD" (without it the entry cannot stand in the grid and is
dropped), `time` "HH:MM", `title`, `type` (the kind's key — `event` or `reminder`), `notifyBefore`
(minutes of advance warning; `0` or absent means at the moment itself), and `integrations`.

## The one thing a bare calendar does

**On its own the calendar raises a toast when an entry falls due, and NOTHING else.** No sending, no
recording, no side effects. This is a law, not a stage of construction: a calendar that quietly grew
the ability to act would be a second, undeclared output door — and the graph would stop describing
what the automation does.

The beat comes from the `cron` tab, never from the calendar itself:

- no `cron` tab, or its schedule is off ⇒ **nothing is watched and no toast is ever raised**, and the
  calendar says so plainly rather than staying silently broken;
- schedule on ⇒ every period the calendar looks for entries whose warning moment has just passed and
  raises one toast per entry.

A due toast **cannot be dismissed by accident**: no click-away, no auto-close, only the explicit
button. Whatever the owner did not acknowledge within one period is cleared on the next tick — the
screen must not silt up with unread notices. What was acknowledged is remembered by the browser, so a
reload does not raise the same notice twice.

Missed while nobody was looking stays missed. The watcher lives in the browser; pretending a closed
browser received a notice would be a lie told by the product.

## Integrations

The calendar may DECLARE outward channels — today `telegram-bot`, `email`, `external-automation`.
Declaration lives in the core (`entity.data.integrations`): which channels this calendar has, and the
SHAPE of the object each one takes. What a particular entry actually sends lives in the entry itself
(`row.integrations`), because a thousand events carry a thousand different letters.

Only an `event` carries integrations. A `reminder` is a note to the owner, not a message to someone
else, and giving it outward channels would blur the only difference between the two kinds.

Integrations are edited by the OWNER. On the public storefront they are visible and readable and
nothing more: a visitor must not rewrite the text that leaves for someone else's inbox.

⚠ **Nothing is sent yet.** This layer declares, shows and edits. The calendar door has no function and
the channels have no keys — an empty channel is the current state, not a defect to be fixed silently.

## Its node

The `calendar` output node is an ordinary output door: `in` required from a `condition-success`, `out`
prohibited, one function, fixed `ioType`. Its integrations add no node and no edge to the graph — they
show up on the canvas as badges and nowhere else. See the exception recorded in `kind.output.md`.
