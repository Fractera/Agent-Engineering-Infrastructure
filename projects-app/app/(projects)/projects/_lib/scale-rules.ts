// THE SCALE RULES (step 253, owner's doctrine) — the THIRD per-automation born document: when one
// automation is TOO BIG and must be decomposed into several independent automations wired into a chained
// group. This module is the ONLY canonical source of the law: AUTOMATION-PROJECTS.md §2.1 and the bundle's
// agent_instruction law (2b) are POINTERS to it now (dedup refactor, owner 2026-07-18), the starter emits
// it as SCALE-RULES.md, and lib/develop.ts appends it to the in-product developer's prompt.

export const SCALE_RULES = `# The scale rules (the decomposition law)

## 1. The node budget (hard numbers)

- **≤24 nodes** — grow freely (but: no use case → no node).
- **25 nodes** — you MUST propose a decomposition seam into a chained group in the same step.
- **30 nodes** — the absolute cap: no new node under any phrasing; growth continues ONLY by decomposition.

Why: runtime never degrades with node count, but a coding agent's comprehension of ONE automation is
bounded — big processes scale only as GROUPS of small, independently fixable members.

## 2. Scale assessment is the FIRST decision

Before ANY change, every developing agent estimates how many nodes the pending work implies, against the
budget. Two triggers, either one is enough:
- the estimate would push this automation over the budget, OR
- the request INHERENTLY describes several independent processes (different inputs, different outputs,
  different rhythms of life — e.g. "a CRM + a newsletter + a support bot" is three automations, whatever
  the node count).

Triggered → make ZERO changes to this automation — no node, no edge, no file. Produce a DECOMPOSITION
RECOMMENDATION instead (§3). That outcome is a SUCCESS, not a failure.

Inside the budget and genuinely one process → decomposition is FORBIDDEN: implement the work. Never
decompose a small task to feel safe — apply the numbers, not a feeling.

## 3. The decomposition recommendation (its exact contract)

Deliver three things, persisted as an owner-decision warning on the \`general\` entity (so the owner finds
and copies it later):
1. **The list of proposed automations** — name + one-line mission each.
2. **A ready-to-paste creation instruction for each** — complete enough that pasting it into the creation
   form births that automation with the right type and founding instruction.
3. **A grouping instruction** — how to wire the members into a chained group (which member feeds which,
   through what typed contract).

## 4. How to cut (the seam law)

- Cut at the NARROWEST seam: the thinnest typed contract between parts — one data shape crossing the
  boundary beats five entangled calls.
- Every member must be a COMPLETE automation on its own: its own inputs and outputs (design them by
  WIRING-RULES.md), individually runnable, individually fixable. Never a half that cannot live alone.
- The parent \`chained\` group takes over the public identity; members keep their own pages and diagrams,
  and stay individually TEST-runnable (production activation is group-only).
- Prove parity: after decomposing an existing automation, two virtual end-to-end tests must show the
  group does what the monolith did.
- Recursion is allowed: a member approaching the budget decomposes again. The budget applies PER MEMBER.
`;
