// THE WIRING RULES (step 252, owner's doctrine 2026-07-18) — the second per-automation document every
// automation is born with (next to AGENTS.md/CLAUDE.md): how an agent must REASON when adding nodes and
// edges, and the laws that make a diagram meaningful. Born from a real failure: a weak model attached a
// voice-input capability as a dead-end transform hanging off a demo parser — it compiled, validated and
// meant nothing. These rules exist so that mistake class is caught by REASONING BEFORE MOUNTING.
//
// One source, two deliveries (the step-251 pattern): the starter emits it as WIRING-RULES.md at the
// automation root; lib/develop.ts appends it to the in-product developer's system prompt.

export const WIRING_RULES = `# The rules of nodes and edges

An edge is DATA FLOWING DOWNSTREAM — never a decoration, never "just a parent". Every wiring decision
below must be made BEFORE you mount a node into the project, and the checklist at the end must be
answered in writing (in the node's spec or your report) before materialize.

## 1. The three roles — classify FIRST, before anything else

Ask two questions about the capability you are about to build:
- Does it RECEIVE from the outside world (a chat message, a webhook, a schedule tick, the launch console)?
  → it is an INPUT node (role "input", ioType = the channel key, e.g. "telegram").
- Does it DELIVER to the outside world or PERSIST the final result (write the history table, send a
  message, publish)? → it is an OUTPUT node (role "output").
- Neither (it changes data or chooses a path between other nodes)? → it is INTERMEDIATE.

One node = one role. A capability that both receives and replies (a chat bot) is TWO nodes: an input
node for receiving and an output node for replying.

## 2. The two intermediate kinds

- TRANSFORM (ioType "transform"): consumes data, produces different data (parse, transcribe, enrich,
  format). It always has a real output someone consumes.
- CONDITION (ioType "condition"): consumes data, CHOOSES the downstream path. It produces no new data —
  it routes. Drawn as a square; keep its label short.

If you want a node with two outgoing paths chosen by logic — that choosing is a CONDITION node's job.
A transform never decides routes.

## 3. The edge laws (counts per role)

| Role | Incoming | Outgoing |
|---|---|---|
| input | exactly 0 — the outside world is its source | exactly 1 (never 2) |
| transform | 1 or more (fan-in of the SAME kind of need is normal) | 1; more only as FAN-OUT (see law 3c) |
| condition | exactly 1 | 2+ branches normally; exactly 1 = a FILTER (see law 3d) |
| output | 1 or more (several branches may end at one recorder) | exactly 0 — nothing flows out of an output |

- (3a) INPUT and OUTPUT nodes NEVER carry two edges on their outside-facing side and never exceed one
  edge on the flow side for inputs. An input with two outgoing edges, or an output with any outgoing
  edge, is illegal — no exceptions.
- (3b) The diagram is a DAG: no edge may create a cycle. Repetition comes from RUNS (cron, instances),
  never from a circular edge.
- (3c) FAN-OUT (one transform → several consumers) is legal ONLY when every target consumes the SAME
  produced data (record it AND notify about it). If the targets should receive it under different
  conditions — that is branching, insert a CONDITION node.
- (3d) A single-branch CONDITION is a FILTER: pass or halt. It is legal only when the halt case is real
  and named in its conditions[] ("no price found → stop"). If both cases continue somewhere, it needs
  two branches.

## 4. The reasoning chain — run it for EVERY new node or edge

1. NAME THE DATA. Write down exactly what flows OUT of this node (its out ports) and WHO consumes it.
   If the honest answer is "nobody" — STOP. Either the node is really an OUTPUT (then it must persist or
   deliver externally itself), or you have not designed the consumer edge yet. A produced value nobody
   consumes is the definition of a dead node.
2. CLASSIFY the role (law 1), then the intermediate kind (law 2).
3. CHECK the counts (law 3) for every edge you are about to add — on both endpoints (your edge changes
   the other node's count too).
4. TRACE THE FULL PATH, out loud, node by node: from some INPUT, through your node, to some OUTPUT.
   "telegram-voice → transcribe → record-to-history". If you cannot recite an input→…→output path that
   passes through your node, the wiring is wrong — do not mount it.
5. NEVER attach to the existing chain "just to have a parent". If your capability starts a new flow, it
   starts at a NEW input node (or reorients the demo input) — it does not dangle off a node whose data
   it neither consumes nor serves.
6. REORIENT, don't append. When the owner's task replaces the demo's purpose, rewire the demo chain to
   the new purpose (rename, retype, reconnect) instead of leaving the demo intact and bolting your node
   to its side.

## 5. Worked example — the failure this document exists to prevent

Task: "voice notes from a Telegram bot must land in the history table."

WRONG (what a weak model actually built): parse-request → telegram-voice, where telegram-voice is an
"intermediate transform" with in:{} and out:{notes} — consumed by NOBODY. It compiled and validated,
and it meant nothing: the notes could never reach the table, the parent's data was never used, an input
capability was classified as intermediate.

RIGHT (what the reasoning chain produces):
  telegram-voice [INPUT, ioType "telegram", 0 in / 1 out]
    → transcribe [TRANSFORM: voice files → text notes]
      → record-note [OUTPUT: writes the notes into the history table]
Path recited: input → transform → output. Every out port has a consumer. Every count is legal.

## 6. The wiring checklist — answer in writing BEFORE materialize

1. What data flows out of this node, and which node consumes it? (name it)
2. Role: input / intermediate / output — and why?
3. If intermediate: transform or condition — and why?
4. Do the edge counts on BOTH endpoints stay legal after my edge? (law 3 table)
5. Recite one full input→…→output path through this node.
6. Does any produced port remain unconsumed? (must be "no", or the node is an output)
7. Did I reorient the demo chain where my task replaces its purpose, instead of appending to it?

A "no answer" to any question means: do not mount — redesign first.
`;
