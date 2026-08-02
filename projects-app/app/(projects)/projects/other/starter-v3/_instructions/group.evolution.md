# THE EVOLUTION GROUP — the automation works on ITSELF, after the answer is already delivered

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

One kind lives here and no other: `evolution` — one node per SCOPE of self-change. This group stands after
the output layer and is the last thing a run does.

## Why it is a layer and not a middle node

| | middle | `evolution` |
|---|---|---|
| what it transforms | the run's payload | **the automation itself** |
| when it works | before delivery | **after delivery — the human already has the answer** |
| may it change the answer | yes, that is its job | **no, and it has no way to** |
| where it writes | the stores | the automation's own configuration |

Work on ONESELF differs from work on data more than the входной слой differs from the выходной. A middle
node by law stands before the output and is expected to shape the result; both are false here.

## What it is for

Modern assistants get better inside a conversation: after each exchange they refine a hidden instruction
about the person they are talking to. This layer is that mechanism, made explicit and visible. Once a cycle
of interaction is finished it looks at what happened and refines the automation's own configuration — the
behaviour instruction on the Assistant tab, the question-answer examples, the voice.

## The inventory — one node per SCOPE, not per output

The unit of learning is the finished CYCLE, not the delivery channel. A run that fanned out into five
stores must not produce five observers, five model calls and a race over one instruction file.

But neither is one node enough for the whole layer: scopes differ by their RIGHT TO WRITE — by what
exactly a node may change. Different rights need different safeguards and different laws, and that is what
makes them different nodes.

| Scope | May change | Iteration |
|---|---|---|
| `capability-gap` | **nothing** — records that the human asked for what the graph cannot do, and warns the owner | 1 |
| `behavior` | the assistant's behaviour instruction | 1 |
| `examples` | the question-answer examples | 1 |
| `voice` | tone, address, length | 1 |
| `graph` | proposes changing the canvas itself — **never applied without the owner's approval** | 2 |
| `custom` | the open door (excluded from the quota) | — |

Vocabulary: `EvolutionScopeSchema`. Everything else is derived from it — the node's `ioType`, its function
name (`behavior` → `evolveBehavior`), its law (`evolution.<scope>.md`), the group's quota. `graph` and
`custom` are excluded from the quota: their node is created when its work is built and proven, never in
advance.

## The law of the group

1. **It is optional.** An automation without evolution is lawful. `output.out` is `optional`, so the layer
   adds a capability without creating a dependency on a model and a key.
2. **It is terminal.** `evolution.out` is a prohibition. Everything this layer produces it WRITES; it hands
   nothing onward. There is no sixth layer — a new capability of this kind is a new SCOPE here.
3. **It never touches the answer.** By the time it runs, the delivery node has already sent the message.
   That is also why its cost is invisible to the human, and why no queue is needed.
4. **It never writes silently.** Every change is a diff the owner can see and undo, recorded in `history`.
5. **It never learns from one message.** Weak signals apply only once they repeat; one odd request must not
   move the assistant's personality forever.
6. **It never learns from refusals.** Runs claimed by `refuse` or `unclaimed` do not teach behaviour —
   otherwise the automation slowly learns to answer what it must not.
7. **It never stores personal data in the instruction.** The instruction is system text, not memory about a
   person: facts live in the stores.
8. **It degrades softly.** No key, no model, no signal → the cycle is skipped honestly. Evolution is
   secondary to answering the human, always.

## Reuse

Domain-neutral by construction: it knows the SHAPE of a dialogue, not the subject of one. Copying a scope
into another automation means copying its instruction with it.
