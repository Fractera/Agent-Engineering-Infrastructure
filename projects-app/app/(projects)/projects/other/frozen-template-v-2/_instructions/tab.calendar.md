# TAB `calendar` — the automation's own schedule

This is the FULL law of the calendar tab. It rides with the object: ask the core door for this tab (or
any entity inside it) and this text comes attached as `tabInstruction`, next to the general `tab` law.
Everything an agent needs to build, extend or repair the calendar is here — no other document has to be
read, and no other document may contradict this one.

WHAT IT IS. A read surface over the output rows of table `calendar`: a month grid on the left, a
30-minute day planner on the right. It creates nothing by hand — entries arrive the way every other row
arrives, from the output door of a run.

AN ENTRY is one row of the automation's row store:

| field | meaning |
|---|---|
| `date` | `"YYYY-MM-DD"`. Without it the entry cannot stand in the grid and is dropped. |
| `time` | `"HH:MM"`, its place in the day planner. Absent = midnight. |
| `title` | what the entry says. |
| `type` | the kind's key — `event` (blue) or `reminder` (amber). |
| `notifyBefore` | minutes of advance warning; `0` or absent = at the moment itself. |
| `integrations` | per outward channel: `{ active, …the channel's own fields }`. |

Rows are append-only. **Editing an entry means appending a line with the SAME `id`** — the reader keeps
the last version of each id. Never rewrite the file: the history of edits is a feature of the journal,
and a half-written rewrite loses everything.

---

## 1. The one thing a bare calendar does

**On its own the calendar raises a notice when an entry falls due, and NOTHING else.** No sending, no
recording, no side effects. This is a law, not a stage of construction: a calendar that quietly grew the
ability to act would be a second, undeclared output door, and the graph would stop describing what the
automation does.

## 2. The beat belongs to the schedule, not to the calendar

How often the automation looks back at itself is declared in the `cron` tab, and the calendar takes that
beat as given. Deriving a period of its own would be a second source of truth about the same fact.

- no `cron` tab, or its schedule is off ⇒ **nothing is watched and no notice is ever raised**, and the
  calendar says so plainly instead of failing silently;
- schedule on ⇒ once per period the calendar looks for entries whose warning moment has just passed.

The tick is aligned to the WALL CLOCK (`now % period`), not counted from page load: the cockpit and the
storefront, opened at different times, must treat the same instant as "due". Otherwise one event has two
different "soon"s.

## 3. The notice, and why it is stubborn

A due notice **cannot be dismissed by accident**: no click-away, no auto-close, only its explicit
button. Several entries falling due together produce several notices, each needing its own
acknowledgement — the second must never overwrite the first.

Whatever was not acknowledged within one period is cleared on the next tick: the screen must not silt up
with unread notices. What WAS acknowledged is remembered by the browser, so a reload does not raise the
same notice twice.

Due means "its moment fell inside the LAST period" — not "at any point in the past". Without that window
a page opened in the morning would dump a stack of notices about everything that happened overnight.
Missed while nobody was looking stays missed: the watcher lives in the browser, and pretending a closed
browser received a notice would be a lie told by the product.

## 4. 🔴 Why DELIVERY may not live in the browser

This is the most important paragraph of this law, and the one most likely to be broken by someone trying
to be helpful.

> **A closed tab sends no letters.** A notice on screen and a delivery to the outside world are
> different obligations. The first may legitimately depend on whether anyone is looking at the page. The
> second may not: an event promised to Telegram or to an inbox must go out whether or not a browser is
> open.

Therefore delivery on due **must execute on the server** and may never be built on top of the browser
watcher. The tempting branch — "if the tab happens to be open, send from there" — is forbidden
explicitly: it produces an automation that works for whoever is watching it and stays silent for whoever
closed their laptop. That is the worst kind of unreliability, because it looks like it works.

When it is built, the server tick pushes the automation through its OWN `api/run` door, the same way
every other channel enters (the law "input arrives by push"). No second execution path is created: an
automation has one point of entry, and a due event comes in through it.

**State today: nothing is delivered on due.** Integrations are declared, their contents are editable,
keys can be entered, and the email send/receive functions exist — but no server-side runner of the
schedule exists yet. This is an OPEN OBLIGATION, not a bug. Do not "fix" it by sending from the browser.

## 5. Integrations

The calendar may DECLARE outward channels — today `telegram-bot`, `email`, `external-automation`.

- **What may be sent** is declared in the core (`entity.data.integrations`): which channels this calendar
  has and the SHAPE of the object each one takes.
- **What a particular entry sends** lives in the entry itself (`row.integrations`), because a thousand
  events carry a thousand different letters.

Two places, and neither duplicates the other.

Only an `event` carries integrations. A `reminder` is a note to the owner, not a message to someone
else; giving it outward channels would blur the only difference between the two kinds.

Integrations are edited by the OWNER. On the public storefront they are visible and readable and nothing
more: a visitor must not rewrite the text that leaves for someone else's inbox.

## 6. Keys

A channel that needs credentials declares them, and the declaration is the whole contract:

- **which** keys are needed is a property of this automation → the core (`envKeys` of the node,
  `envKeys` of the integration);
- **what** each key is — human name, where to get it, secret or optional — is a property of the service
  → the catalogue `_components/channels.ts`.

Values never live in a file of this folder. They live in the environment and travel through the single
door `api/env`: one key per write, presence-only on read. Keys are project-wide: one Resend account, one
bot, one set for every automation.

An integration whose keys are absent is shown DIMMED and cannot be switched on — clicking it opens the
key form. Declared and configured are two different facts and must not be collapsed: the owner has to
see the difference with his eyes, not learn it from a failed run.

## 7. Its node

The `calendar` output node is an ordinary output door: `in` required from a `condition-success`, `out`
prohibited, one function, fixed `ioType`. Its integrations add no node and no edge — they appear on the
canvas as badges and nowhere else.

This is the one recorded exception to "one destination, one door" (see `kind.output.md`): a SCHEDULER
channel may fan the same due event out to several places. It is not three deliveries; it is one event
announced in several places, chosen per entry by the owner rather than by the graph.

## 8. Where the code lives

```
_components/calendar/       index.tsx (router) · i18n.ts (×10) · entries.ts (kinds) · integrations.ts (channels)
  public/                   one file per calendar + components/ (loader · month grid · day planner ·
                            due watcher · integrations menu · integration drawer)
  admin/                    settings + its own components/
_lib/components/calendar/   everything that is not markup: row parsing, month cells, day slots, due maths
```

The split is not decorative. A tab's markup and a tab's arithmetic are edited by different reasons at
different times; keeping the maths in `_lib` is what lets the view be rewritten without re-deriving when
an entry is due.
