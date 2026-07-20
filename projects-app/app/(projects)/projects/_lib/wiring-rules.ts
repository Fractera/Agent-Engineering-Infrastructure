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

## 0. Where the wiring LIVES

\`_data/graph.json\` — one file, the whole structure: \`nodes\` (cuid, slug, name, ord, x, y, draft, status)
and \`edges\` (\`{ "from": "<cuid>", "to": "<cuid>" }\`). Edges join nodes BY CUID, taken from the node
entries in that same file.

Everything reads it: the canvas the owner drags, the executor that orders the run, the gate that judges
your diff. So there is nothing to keep in step — change the wiring HERE and it is changed everywhere.

\`meta.ts\` describes what a node DOES (role, ioType, ports, duration) and says nothing about what it is
connected to. The retired \`parentId\` field was exactly that second source of wiring: an edge dragged on
the canvas never reached it, an edge written into it never reached the canvas. Do not reintroduce it.

## 1. The three roles — classify FIRST, before anything else

Ask two questions about the capability you are about to build:
- Does it RECEIVE from the outside world (a chat message, a webhook, a schedule tick, the launch console)?
  → it is an INPUT node (role "input", ioType = the channel key, e.g. "telegram").
- Does it DELIVER to the outside world or PERSIST the final result (write the history table, send a
  message, publish)? → it is an OUTPUT node (role "output").
- Neither (it changes data or chooses a path between other nodes)? → it is INTERMEDIATE.

One node = one role. A capability that both receives and replies (a chat bot) is TWO nodes: an input
node for receiving and an output node for replying.

A ROLE IS FOR LIFE (owner's law, 2026-07-19 — born from a real mutation). Once a node exists, its role
and its ioType NEVER change: an input stays an input on its channel, a transform stays a transform, a
condition stays a condition, an output stays an output. You may not "promote" an input into a
transform, repurpose a control-panel input as a telegram input, or turn anything into anything else.
If a spot in the graph needs a DIFFERENT role — that is a NEW node (create it, wire it), and if the old
node truly lost its purpose, remove it through the platform's DELETE API and say so in your report.
The apply gate enforces this mechanically: a diff that changes an existing node's role or ioType is
refused whole. This law exists because a strong model once read "reorient the demo" as permission to
shift a live control-panel input aside while adding a telegram channel — and mutated the project.

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

## 3b. The design artifact — TARGET-GRAPH.md, BEFORE any code (owner's law, 2026-07-19)

You do not design in your head. Your FIRST authored file is TARGET-GRAPH.md at the project root:
- a table of EVERY node: role, ioType, in keys, out keys;
- every edge, and the full input→…→output path recited for EVERY surface;
- the fate of every EXISTING node: kept / reoriented / deleted — with the reason.
The apply gate refuses a diff that adds nodes without this artifact, and refuses any resulting graph
with a STARVED node (its inputs producible by no one) or a DEAD END (its outputs read by no one).
Born from a real failure: a model bolted a two-node island onto a demo — nothing fed it, nobody read
it, and structural validation passed it. The plan-then-gate loop is what keeps design honest.

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
   starts at a NEW input node — it does not dangle off a node whose data it neither consumes nor serves.
6. REORIENT THE DEMO, and ONLY the demo. When the owner's FIRST real task replaces the purpose of the
   untouched newborn demo chain, rewire that demo chain to the new purpose: rename nodes, reconnect
   edges, rewrite functions. Reorientation NEVER includes changing any node's role or ioType (the
   role-for-life law above) — and it applies ONLY to the demo that no real task has claimed yet. A chain
   that already serves the owner is live infrastructure: you extend it additively (law 5 below), you do
   not shift it.

## 5. Adding a channel — the ADDITIVE protocol (owner's law, 2026-07-19)

"Add a Telegram channel" NEVER means "replace the control panel". Unless the owner explicitly says to
REMOVE a surface, every existing input and output channel keeps working exactly as before — the task is
finished only when BOTH the new and every old surface run green. The protocol:

- (5a) The new channel enters through a NEW INPUT node (role "input", ioType = the channel key,
  0 in / 1 out). Existing input nodes are not touched, not moved, not retyped, not renamed.
- (5b) NORMALIZE, then JOIN. The new input node's job is to convert its channel's raw payload into the
  SAME data the existing midstream already consumes (the same out-key names), and its one outgoing edge
  plugs into the EXISTING midstream node that solves the task. Fan-in of the same need into one
  transform is normal and legal (law 3).
- (5c) REUSE before build. If an existing node solves (or almost solves) the task your channel needs —
  connect to it. If it almost solves it, STRENGTHEN that node by ADDING functions or ADDING optional
  parameters. Only when no node solves the task at all do you create a new transform.
- (5d) AN EXISTING NODE'S CONTRACT IS PUBLIC. Its function names, its paramsIn names and its out keys
  are relied upon by every other surface and by the cockpit. You may add; you may NEVER rename, remove
  or repurpose an existing name. (Real failure: renaming an entry parameter "ask" → "query" to suit the
  new channel silently broke the control panel that still sent "ask".)
- (5e) A channel that must REPLY gets its OWN output node (telegram-in → … → telegram-reply-out).
  Existing outputs keep serving their own surfaces; an output never grows an outgoing edge (law 3).
- (5f) THE PARITY TEST closes the task: after wiring the new channel, run EVERY pre-existing surface
  (the control panel ask, the cron tick, each old channel) and show they still succeed. A channel
  addition that breaks another channel is a failed task, not a partial success.
- (5g) INPUT IS PUSHED, NEVER POLLED (owner's law, 2026-07-20). Incoming events reach this automation
  as a PUSH into its run door (api/run): the platform listener holds the channel connection and calls
  the door instantly with the message envelope. Connecting a Telegram bot = declare the token's env key
  in _data/channels.ts + register via POST /api/project-config/register-bot — nothing else. Writing
  your own getUpdates call, or scheduling input polling in cron.json, is FORBIDDEN and machine-refused
  by the apply gate: a second getUpdates consumer on one token eats the listener's messages and breaks
  the channel (Telegram hands each update to exactly one caller). cron.json exists only for scheduled
  OUTPUT work (reports, digests) and pulls of external DATA APIs — never for input channels.
  (Real failure: a strong model wired a one-minute cron getUpdates poll on medicine/v2 instead of the
  one register-bot call — latency became a minute, and the poll fought the platform listener.)

## 6. Worked example — the failure this document exists to prevent

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

## 7. The wiring checklist — answer in writing BEFORE materialize

1. What data flows out of this node, and which node consumes it? (name it)
2. Role: input / intermediate / output — and why?
3. If intermediate: transform or condition — and why?
4. Do the edge counts on BOTH endpoints stay legal after my edge? (law 3 table)
5. Recite one full input→…→output path through this node.
6. Does any produced port remain unconsumed? (must be "no", or the node is an output)
7. Did I reorient the demo chain where my task replaces its purpose, instead of appending to it?
   (Demo only — a chain already serving the owner is extended additively, law 5.)
8. Does every EXISTING node keep its role, its ioType, and every existing function/param/out-key name
   untouched? (role-for-life + the public contract, laws 1 and 5d)
9. If I added a channel: which existing midstream node does it join, and did EVERY old surface pass
   the parity test? (laws 5b and 5f)

A "no answer" to any question means: do not mount — redesign first.
`;
