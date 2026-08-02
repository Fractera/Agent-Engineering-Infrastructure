# replies — HOW THIS AUTOMATION SPEAKS TO A HUMAN

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

The runtime speech contract. Two nodes implement it: `converse` (the model, driven by the behaviour
instruction of the **Assistant** tab) and `composeReply`, its deterministic FALLBACK when no model or key
is available. Both put `ctx.reply`; delivery nodes send that, never a node's raw text.

## 0. 🔒 WHAT IS NOT IN THE BUILD IS NOT SPOKEN OF

A line exists here ONLY together with the node that produces its signal. Never earlier, never "for the
future". Promising beyond the core is the same critical violation as a no-op stub.

## 1. Voice

A frozen test template: it has no purpose of its own yet — the owner gives it one. Short, warm, to the
point, one emoji marking the outcome; never echoes the user's question back at them. Voice, tone and
language are set by the owner in the **Assistant** tab (data in the core). This file is the FORM, not the
persona.

## 2. Capabilities

On `/start`, "what can you do" and on an UNUNDERSTOOD message: a short list of what this build REALLY does
— take a message through any open input, deliver it to every open output.

🔒 That list is hard-coded in `composeReply` and therefore ROTS by nature: open a channel and it does not
appear, remove a node and it does not leave. It is a seed, not the final text; deriving it from the core on
every iteration is the duty of the `behavior` node of the evolution layer (spec 314 §4a). Until then:
**what is not in the list is not in the build; promising beyond the core is forbidden.**

## 3. One outcome → one line

| Branch | Signal | Reply | Who produces the signal today |
|---|---|---|---|
| the front already answered | `reply` | passed through untouched | classes `refuse`, `self-describe`, `small-talk`, `incomplete`, `unclaimed` |
| capabilities | `showHelp` | the list of §2 | the run door (`/start`, "what can you do") |
| a moment | `when` (+ `remindText`) | "I'll remind you on \<date time\>: \<text\>" | `resolveMoment` |
| no moment | `needsWhen` | "When should I remind you?" | `deliverCalendar` |
| recorded | `noteSummary` | "Saved: \<gist\>" | **nobody — the form is declared, its producer is not built** |
| read own | `recallAnswer` | "\<answer\>" | **nobody — the form is declared, its producer is not built** |
| not understood | nothing collected | "I didn't understand" + §2 | — |

The last two are marked honestly: the shape exists in code, the node that fills it does not. That is a
recorded discrepancy, not a deferral — step 312 closes it together with the decision of WHICH node produces
those signals.

## 4. A composite run

One run may yield several lines. Then the reply is ONE message, lines separated by a blank line, in the
order of the table above.

## 5. Laws

- **The reply is assembled in ONE place.** Branch nodes leave a STRUCTURAL result, never a finished phrase.
  A new branch adds its line HERE and in the composer — never as text glued inside its own node.
- **The front outranks the composer.** A class that answered for itself (`ctx.reply`) is not rewritten:
  overwriting it would restore the v2 defect where speech lived outside the graph and delivery replaced what
  the route had decided.
- **An empty reply is impossible:** a real message always yields a line (at worst, the capability list).
- **Speech is the MODEL's work, not a phrase list.** The law "work without AI" governs data transforms, not
  speech. Enumerating greetings or identity questions inside a node is forbidden.
- **Dialogue memory is a separate mechanism** (last N messages + TTL from the Assistant tab), not this
  contract; here lives only the shape of a reply to ONE run.
