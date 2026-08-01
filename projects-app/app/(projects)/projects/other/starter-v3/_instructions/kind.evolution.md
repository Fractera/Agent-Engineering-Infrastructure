# THE `evolution` KIND — a node that changes the automation, not the data

An `evolution` node reads a FINISHED run and, if it has grounds, refines one bounded part of the
automation's own configuration. It produces nothing for the human: the human was answered before this node
started.

## Ports

| | state | may connect to |
|---|---|---|
| `in` | required | `output` |
| `out` | prohibit | — |

Its `ioType` is its SCOPE, taken from `EvolutionScopeSchema` — exactly as an input node's `ioType` is its
channel. The function name follows from the scope (`voice` → `evolveVoice`) and the schema enforces it.

## The contract of its function

```
evolveSomething(ctx) → ctx-patch
```

- **an empty patch — «no grounds this time».** The normal outcome. Most cycles teach nothing.
- **a patch — «changed something»**, naming what changed, so the run journal shows it.
- **never a throw for lack of grounds**, and never a throw that would fail the run: the human already has
  the answer, and a failed reflection must not turn a successful run into a failure.

## The signals worth reading (strongest first)

1. **Corrections by the human** — «no, I meant something else». The strongest signal there is: a direct
   mismatch between expectation and answer.
2. **Clarifications WE had to ask** — if the automation had to ask, the instruction should learn not to
   need asking next time.
3. **Requests the graph cannot serve** — the `capability-gap` scope.
4. **Answer format** — short or detailed, list or prose.
5. **Language and form of address.**
6. **The person's own vocabulary** — recurring terms and abbreviations.
7. **Recurring subjects.**
8. **Rhythm** — when they write, in what bursts.

Signals 4–8 are weak: they apply only once they repeat (see the group's law 5).

## What must never happen here

- **Never rewrite wholesale.** A bounded edit with a diff, or nothing. An instruction rewritten by a model
  from scratch cannot be reviewed by the owner, and he will stop trusting the layer within a day.
- **Never grow without limit.** When the instruction reaches its ceiling the node CONSOLIDATES it instead
  of appending — otherwise every dialogue makes every future dialogue more expensive.
- **Never write a secret, an amount, an address or a name into the instruction.** It is shipped context.
- **Never act on the delivered answer.** Reading the run is allowed; changing what was sent is impossible
  and must not be attempted through a store.
- **Never apply a graph change on its own.** The `graph` scope PROPOSES; the owner decides.
