# DESTINATION `custom` — the open door of the output side, and the law for adding a destination

Not a destination. The single lawful way to add one. `custom` sits in the output vocabulary but is EXCLUDED
from the group's quota: no node is born with it, one is made when a destination is really needed. It is also
the `ioType` the output connector carries — the tail this automation offers to a neighbour.

## Default answer: no

Eleven doors already cover where a result can go: the automation's own page, the public surface, a chat, a
letter, a calendar, a map, a chart, and the three stores. Most "we need a destination" is one of:

1. **An addressee mistaken for a destination.** Three different people receiving mail are three recipients on
   ONE email door. The destination is the KIND of place, not who is there.
2. **A format mistaken for a destination.** "As a PDF" is shaping, and shaping happens upstream.
3. **A schedule mistaken for a destination.** "Send it every Monday" is the calendar plus an existing door.

## The three questions that must all pass

Answer all three in the node's `description`:

1. **Is it a kind of place none of the eleven describes?** Not a new recipient, not a new format.
2. **Can it fail loudly?** A destination whose failure cannot be detected must not exist: a silent send is a
   lie the owner discovers weeks later.
3. **Would it exist in a completely different business?** Replace the subject with another noun. A
   destination that only makes sense for one domain belongs to that automation, not to the template.

Fail any one → not a destination.

## How to add one

1. Add the value to `OutputChannelSchema`. The quota is COUNTED from the vocabulary, so it moves by itself —
   and one more node becomes mandatory in every automation.
2. Register `output.<channel>` in `SYSTEM_INSTRUCTION_NAMES` and write its law; the module refuses to load
   otherwise.
3. Write the function — the name is DERIVED (`deliver` + the channel in PascalCase) — and register it in
   `_lib/nodes/index.ts`.
4. Declare its keys in `envKeys`, describe them in `_components/channels.ts`.
5. `npm run check:core`, then prove delivery with a real run — and prove the FAILURE path too.

## What must never happen

- **Never a door that composes the answer.** It delivers what the route produced.
- **Never a door that swallows an error.**
- **Never two doors for one addressee**, and never one door for two kinds of place.
- **Never leave it named `custom`.** Once the destination has a name, give it that name in the vocabulary.
