# The LONG memory of a CONVERSATION — two homes, one truth

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

Short memory is the buffer (`group.speech.md`): a window of turns and an hour of silence. Long memory is what
survives that — so a person can ask months later, *"do you remember we talked about the green bicycle?"*

## Why TWO homes and not just the vector

The vector index is **shared by every automation on this server**. From the answer *"yes, we discussed it"*
you cannot tell whether it was discussed HERE. So:

- the **vector** answers *what it was about* — meaning, searched in the person's own words;
- the **`conversation` table** answers *whose it is, what was said exactly and WHEN* — it lives inside this
  folder, so ownership cannot lie. It also carries the date: a memory chunk has **no time field at all**.

They are joined by the marker `[mem#<id>]` written into the indexed text: an excerpt resolves back to its
row in one step.

## The three rules that keep it honest

1. **Provenance names the kind.** Every document is stored as `projects/<address>?channel=…&kind=…&record=…`.
   `kind=conversation` for a turn, `fact` (the default) for what a run brought in. Without it a question
   about a past conversation retrieves an encyclopedia article and presents it as your talk.
2. **Read filters by address FIRST.** Use `recallScoped` (`_lib/memory.ts`) over `/query/data`, never the
   synthesized answer of `/query`: that prose is built from every automation's chunks and cannot be filtered
   afterwards. Foreign excerpts are dropped before the reply is composed, so speech CANNOT cite a
   conversation that happened elsewhere.
3. **The memory always returns something — judge relevance yourself.** `hybrid` retrieval hands back the
   nearest k chunks and never says "nothing found". An excerpt with no significant word in common with the
   question is OFF TOPIC and must be dropped. Skipping this made the assistant agree it remembered a roof
   repair it had never heard of.

**And the rule speech obeys:** given no material, you do NOT remember. Agreeing without excerpts is a lie —
the worst kind here, because it is indistinguishable from truth until the person checks.

## When a turn moves

At EVICTION, not at every message: a turn enters long memory exactly when the buffer lets it go
(`condense` in `converse.ts` — one author, one moment). While a conversation is live it is already in front
of the model; only what has been forgotten needs searching for.

## What this is NOT

`conversation` is **not an entity store**. `ENTITY_STORES` hold what the automation OWNS and write only for
recording classes — asking is not saving. A conversation happens regardless of class, so it is a third kind:
neither an entity nor a run journal. `mayWriteEntity` does not apply, and that is not a loophole — the law
is about something else.
