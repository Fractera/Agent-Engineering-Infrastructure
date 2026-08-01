# THE `intent` KIND — a node that judges a request and chooses its route

An `intent` node answers ONE question: «is this request mine?» It does not transform the payload, it does
not write anything anywhere, and it never talks to a store. It decides.

## Ports

| | state | may connect to |
|---|---|---|
| `in` | required | `input`, `input-connector` |
| `out` | required | `transform`, `output`, `output-connector` |

Both ports are required, and that is deliberate: a class with no way in judges nothing, and a class with
no way out decides nothing. `ioType` is always `null` — a class node carries no channel, because it judges
ABOUT a request rather than carrying it through a door.

## The contract of its function

```
intentSomething(ctx) → ctx-patch | null
```

- **`null` — «not my request».** The engine stops this branch, without an error. This is the normal, most
  frequent outcome: nine classes out of ten return `null` on any given run.
- **a ctx-patch — «mine».** It must contain at least `intentClass` (which class claimed the run) and
  `intentRoute` (where it is being sent). Whatever else it puts in — `reply`, `text`, a parsed field — is
  what the rest of the route will work with.
- **a throw — a real failure.** Reserve it for a broken environment, never for «I did not recognize it»:
  not recognizing is `null`.

## How it decides

Deterministically where the forms of the request are finite (a question about the automation itself, a
refusal-worthy request), by the model where they are genuinely unbounded. Deterministic first: a class
that needs no key keeps working on a server where no key has been entered yet, and this template must run
the moment it is deployed.

When the model IS used, its answer is checked deterministically afterwards — a token outside the expected
set is treated as «not recognized» (`null`), never guessed into the nearest class.

## What must never happen here

- **No silent default.** Do not let a class say «probably mine» to keep the flow alive. An unclaimed
  request is honestly unclaimed.
- **No greed.** Keep the recognized forms narrow. A class that grabs a neighbour's request is worse than a
  class that misses its own: the owner sees a confident wrong answer instead of an honest question.
- **No writing.** If your class needs to store something, it routes to the middle and the output layer —
  that is what they are for. A front node that writes rows is the v2 defect this layer exists to end.
- **No domain nouns.** The class is a form of address, not a business. Apply the neutrality test: replace
  «object» with any other noun; if the class stops making sense, it is not a class, it is a feature.
