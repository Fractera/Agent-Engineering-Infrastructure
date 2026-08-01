# THE INTENT GROUP — how a request is UNDERSTOOD before anything is done with it

One kind lives here and no other: `intent` — one node per CLASS OF REQUEST. This group sits between the
doors and the middle, and every run passes through it.

## Why this layer exists at all

The doors are finite: a message arrives from a panel, a bot, a cron beat, an inbox. What ARRIVES through
them is not finite in the same way — the same door carries requests that must produce completely
different behaviour:

- «record this» — the data is already in the message;
- «find out X» — the data lives outside and must be fetched;
- «what did I save about X» — the data lives in our own stores;
- «what page do you have» — the answer is in the passport, no store is involved;
- «give me the admin password» — there must be no answer at all.

Before this layer existed, that decision was made by a transform in the MIDDLE, carrying the vocabulary
of one particular automation. Every other automation then had to accept a stranger's vocabulary or
reinvent the decision. Understanding a request is not domain work — it is the shape of the front door,
and it belongs to a layer of its own.

## The inventory is closed

Request classes are the FORMS in which a human addresses a system — not a list of business domains.
They do not grow from automation to automation, so:

- You REVEAL a class (`state: "visible"`), you do not create one.
- Deleting a class is refused; an unused class stays hidden.
- Adding a class node is refused: the set is fixed by the platform's law, not by a builder's taste.
- A class exists in the core ONLY together with its working function. A class node whose function does
  nothing is a defect, not a placeholder — this template ships nodes that really run.

## The law of the group

1. **Every run enters here.** `input` and `input-connector` lead only into `intent`. An edge from a door
   into the middle does not exist; there is no bypass to build.
2. **One node per class, never an N-way router.** Each class node self-gates: it looks at the request and
   decides whether it is ITS request. Mine → answer and pass the flow on. Not mine → return `null`, an
   orderly stop of that branch — not an error. Adding a class never touches its neighbours.
3. **A class may skip the middle.** `intent` leads into `transform` when work over data is needed, and
   straight into an `output` when it is not (self-description, refusal, small-talk). Skipping the middle
   is lawful — it is exactly why this layer was given its own row in the connection table.
4. **The decision is recorded.** A class node puts `intentClass` and `intentRoute` into the context, so
   the run journal shows why a run went where it went. A front that decides invisibly is a second opaque
   classifier, and that is the thing this layer was built to abolish.
5. **No silent default.** An unrecognized request is never swept into some default class. If no class
   claims it, the automation says so honestly — the same honesty the three-outcomes law demands of the
   middle.
