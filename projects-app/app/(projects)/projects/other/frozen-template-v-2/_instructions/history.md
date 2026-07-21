# HISTORY — one entry per round of work

A VERSION IS ONE ROUND: everything you did between opening `api/work` and closing the last object you
were able to close. Not one per node, not one per day.

`POST api/patch { op: "append", object: "history", value: { createdAt, objectsTouched, summary } }` —
the core issues the cuid and the version number.

- `createdAt` — `dd-mm-yyyy hh:mm:ss`, the real time you finished.
- `objectsTouched` — the plain COUNT of objects created, updated or deleted in this round: nodes,
  edges, tabs, entities. Count them honestly; the number is how the owner senses the size of a round
  without reading it.
- `summary` — up to 500 characters, in the owner's language: what changed and why, plus what stayed
  BLOCKED and where its warning sits. A round that ended in a decomposition recommendation, or in
  warnings alone, is still a round and still gets its version.

## The laws around it

- APPEND ONLY. A version already written is history: it is never edited and never removed, even when
  the work it describes was later undone. The undoing is the next version.
- ONE ROUND, ONE VERSION — written at the END, after the proofs of the closing ceremony
  (passport §15). A round with no version did not happen as far as the owner can see.
- WRITE IT EVEN WHEN LITTLE HAPPENED. "Nothing was buildable: cases 03 and 04 contradict each other,
  warning left on useCases" is exactly the kind of entry that saves the next round from repeating you.
