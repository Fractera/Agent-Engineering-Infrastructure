# CLASS `custom` — the open door, and the law for GROWING the front

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

This is not a class of request. It is the single lawful way to add one, and the rules that make adding rare.

`custom` sits in the class vocabulary but is EXCLUDED from the group's quota, exactly as `custom` sits in
the channel vocabularies: no node for it is born with the automation, and one is made when it is actually
needed. So a model reading the core learns two things at once — the front CAN grow, and it does not grow by
itself.

## Default answer: no

The eleven classes are a partition along two axes, not a collection (see `group.intent.md`). Most
«we need a new class» turns out to be one of these three mistakes:

1. **A topic mistaken for a form.** «Invoices», «flights», «patients» are subject areas. They differ in what
   the middle DOES, not in how the human addresses the system. They belong to middle nodes.
2. **A capability mistaken for a class.** «We need to read a PDF» is a capability of a middle node — declare
   it there (`capability`), do not name the front after it.
3. **A variant mistaken for a class.** «Ask with a photo attached» is the same class carrying an attachment.

## The three questions that must all pass

Before adding a class, answer all three in writing, in the node's `description`:

1. **Does it differ along an AXIS?** Either the answer lives somewhere none of the eleven names (not in the
   message, not outside, not in our stores, not in the passport, not forbidden), or the request has a
   completeness the eleven do not cover (not whole, not a continuation, not mere courtesy). A difference in
   subject matter is not an axis.
2. **Would it exist in a completely different business?** Replace the subject with another noun — request,
   part, patient, shipment. If the class stops making sense, it is a feature of one domain and belongs in
   the middle.
3. **Can it be stated in one sentence with no domain noun in it?** If not, it is not a form of address.

Fail any one → it is not a class. Build it in the middle instead, and say so plainly to the owner.

## Known candidates (open, deliberately not yet added)

Recorded so the next session neither re-discovers them nor adds them casually:

- **act-outward** — «send this to Peter», «publish it»: a command to PERFORM an action in the outside world.
  Not `fetch-external` (which brings data back), not `record-given`. Probably a real class.
- **standing-order** — «every Monday do X»: deferred, repeating work. Resembles `control` but is not a
  configuration change.
- **correction** — «no, twenty, not thirty», «delete that»: changes an existing record with no question
  outstanding, so it is neither `continuation` nor a new record.
- **meta-about-own-work** — «what did you do today», «why did you not answer»: about the automation's
  behaviour rather than its identity, so `self-describe` does not cover it.

## How to add one (the whole procedure)

1. Add the value to `IntentClassSchema` in `_data/automation.schema.ts`. **Position is precedence** — the
   first claimer wins, so a narrow class goes before wider ones. Placing it last but before `unclaimed` is
   the safe default.
2. Register `intent.<class>` in `SYSTEM_INSTRUCTION_NAMES` and write `_instructions/intent.<class>.md` — the
   module refuses to load if a class has no registered instruction.
3. Write the function. Its name is DERIVED, not chosen: `fetch-external` → `intentFetchExternal`. Register
   it in `_lib/nodes/index.ts`.
4. Add the node through `api/patch` with `ioType: "<class>"`. The quota moves by itself — it is counted from
   the vocabulary.
5. `npm run check:core`, then prove it with a real run. A class that has never claimed a real request is not
   finished.

## What must never happen

- **Never a placeholder class.** A node whose function recognizes nothing is a defect, not a draft — this
  template ships nodes that run.
- **Never a greedy class.** A new class that also claims requests belonging to old ones breaks them
  silently; the run journal will show the wrong class, and nobody looks until something is lost.
- **Never leave it named `custom`.** `custom` is a staging area. The moment the class has a name, give it
  that name in the vocabulary — a front full of `custom` nodes is a front with no law again.
