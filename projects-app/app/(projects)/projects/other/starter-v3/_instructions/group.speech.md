# GROUP `speech` — one voice, and the plane it remembers on

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

**Exactly one node, never two.** Neither deletion nor addition is allowed. Two speaking nodes would mean two
voices and two places where the answer is assembled — the very defect the layer removes (the reply used to
be built both inside the Telegram output and inside the run door). The node's own law: `kind.speech.md`.

The group is OPTIONAL in a core: an automation that answers nobody — a scheduled tick that files a row — is
lawful and must not be forced to reach a model.

## The dialogue plane — the axis the pipeline does not have

A conversation does not fit one run: a question is asked now and answered by the NEXT message. That axis is
TIME, and it is carried by the chat state — the recent messages, the outstanding question, the chosen
language — keyed by the interlocutor (`telegram:<id>`, `email:<from>`, `panel`).

- The ENGINE attaches it once per run, as soon as the doors have named the interlocutor; **any layer may
  read it** — it is ordinary context.
- **Only this layer writes it.** One author per entity, exactly as only `deliverToast` writes a toast row.
- No interlocutor (cron, webhook) → no plane, and the run works as before.

Because of it the class `continuation` can exist at all: before the plane, the outstanding question died
with its run and the class could never claim.

## Where it stands

Ports are the connection table (`api/core`), not prose. In words: it receives from the front and from both
branches of the middle, and it leads into the outputs — including the connector, so a neighbouring
automation gets the same answer the human does.
