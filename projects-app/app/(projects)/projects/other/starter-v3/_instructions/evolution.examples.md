# EVOLUTION `examples` — the automation learns from a correction

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

Writes ONE field: `assistant` tab → `data.qa`. The instruction and the voice are not its business.

**A correction is the strongest signal there is** (§5 of the spec). "No, I meant something else" is a direct
mismatch between expectation and answer, and it is worth more than any observation: the person has already
said HOW it should have been. The pair *question → the answer they wanted* becomes an example, and next time
the speech layer answers in that style by itself.

- Same question already stored → nothing is written, and no version is recorded.
- Examples do not grow without bound: they travel to the model with the instruction, so at the limit the
  oldest is evicted — the same nature of limit as the instruction's ceiling.
- Never learn from a refusal (П5): a `refuse` run must not teach the automation to answer what it must not.
