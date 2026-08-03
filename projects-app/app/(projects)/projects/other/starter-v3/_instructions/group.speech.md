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
- **Its window is a setting** — `assistant` tab `data.memory`: `lastN` messages, `ttlMinutes` of silence
  before the buffer is a clean new session. The engine reads it and passes it to `formatDialog`, which has
  **no default**: a hard-coded limit there beat the owner's setting, and the setting promised control it did
  not have. **One form, one assembly** — never render the history a second way (330.1).
- **TWO limits, and the second one counts price** (330.2). `data.memory.tokenBudget` caps what the dialogue
  may COST; `lastN` caps how many messages are worth keeping. Whichever binds first wins, and the run says
  which: `ctx.dialogueBudget` carries `used` · `budget` · `dropped` · `limitedBy`. Counting messages alone
  is a bad measure — one dictated voice message outweighs twenty typed ones.
  Eviction drops the OLDEST message whole; half a line is worse than none, because the model completes it.
- **A turn is an ENVELOPE, not a line** (330.3, `TurnSchema` in `_data/record.schema.ts`): what the run was
  (`class`), how it ended (`outcome`: ok · refused · missing · unreachable · failed), what it left behind
  (`links`), which run it was (`runId`). Rendering shows the outcome only when it is not `ok` — success is
  the norm and paying tokens for it is paying for silence, but a failure the model cannot see is a failure
  it confidently talks over.
- **Speech is still the only author — and the engine still seals.** Speech BIRTHS the turn (text, class,
  time). The outcome and the created rows are stamped by the engine at the END of the run (`sealTurns`),
  because speech stands BEFORE the outputs: when it speaks, no store has run yet, so those facts do not
  exist for it. That is not a second author, it is `updatedAt` — the sealing never touches the text.
- **Who gets what is decided once, by the engine.** `recentDialog` — the conversation, for speech.
  `recentDialogBrief` — the last exchange only, on a derived share of the budget, for reading the request
  class (it runs on EVERY run, so it must stay cheap). A node never assembles history for itself: that is
  how a budget becomes nobody's.
- **Only this layer writes it.** One author per entity, exactly as only `deliverToast` writes a toast row.
- No interlocutor (cron, webhook) → no plane, and the run works as before.

Because of it the class `continuation` can exist at all: before the plane, the outstanding question died
with its run and the class could never claim.

## Where it stands

Ports are the connection table (`api/core`), not prose. In words: it receives from the front and from both
branches of the middle, and it leads into the outputs — including the connector, so a neighbouring
automation gets the same answer the human does.
