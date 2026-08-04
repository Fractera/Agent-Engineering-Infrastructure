// THE SCALE RULES (step 253, owner's doctrine) — the THIRD per-automation born document: when one
// automation is TOO BIG and must be decomposed into several independent automations wired into a chained
// group. This module is the ONLY canonical source of the law: AUTOMATION-PROJECTS.md §2.1 and the bundle's
// agent_instruction law (2b) are POINTERS to it now (dedup refactor, owner 2026-07-18), the starter emits
// it as SCALE-RULES.md, and lib/develop.ts appends it to the in-product developer's prompt.

export const SCALE_RULES = `# The scale rules (the decomposition law)

## 1. The budget (hard numbers) — COUNT TASKS, AND COUNT WORK NODES

**An automation carries 2 to 5 TASKS. Four is comfortable, five is the ceiling, six is a decomposition.**
A task is one thing the owner wants done, i.e. one use case — not one node.

- **≤5 use cases AND ≤12 work nodes** — grow freely (but: no use case → no node).
- **6th use case, or 13 work nodes** — you MUST propose a decomposition seam into a chained group in the
  same step.
- **8 use cases or 16 work nodes** — the absolute cap: no new node under any phrasing.

**Count WORK nodes — the middle layer only.** Inputs, intent classes, speech, outputs and evolution are
fixed by their vocabularies: their number follows the channels the owner opened, not the tasks. A build
with 46 nodes of which 9 are middle is SMALL, not oversized.

## 1a. Why — two independent reasons, and the first one was measured wrong before

**Runtime cost (measured 2026-08-04, and it corrects the previous version of this law).** The engine runs
EVERY VISIBLE node on EVERY run: a bare "hello" executed **33 node functions**, nine of which returned
empty ("not my run"). So the earlier claim here — *"runtime never degrades with node count"* — was FALSE.
Cost grows linearly with visible nodes and is paid on every message, including greetings. Fewer nodes is
not tidiness, it is the price of every answer.

**Agent comprehension.** A coding agent's grasp of ONE automation is bounded; big processes scale only as
GROUPS of small, independently fixable members. This reason was always true and stays.

**Practical corollary, immediately actionable:** an automation that does not use a channel must keep that
channel's nodes HIDDEN. A hidden node does not run, so closing unused doors is a direct, measurable saving
on every run — not housekeeping.

## 1b. Growth goes SIDEWAYS, not upward (owner's doctrine 2026-08-04)

When a person asks for something this build does not do, the default answer is **another automation**, not
another node here. Three outcomes, decided by checkable facts:

| The request… | Recommend |
|---|---|
| is the SAME job, and this build is under budget | build it HERE — a Development Step, as usual |
| is a different job, but shares the channels and stores (same bot, same base) | a NEW automation **by cloning**: it inherits the doors, and the other nodes are revealed in it |
| shares nothing — different input, different output, different rhythm | a NEW automation **from scratch** |

"A different job" is already defined in §2: different inputs, different outputs, different rhythms of life.

**Cloning is what birth already is** (\`_lib/v2-birth.ts\`, step 301): a new automation is a COPY of the
frozen starter, which ships with every node hidden. So "clone it and switch off what I do not need" is
simply "clone it and reveal what I do need" — the capability exists, only the direction of speech differs.

**Say the reason out loud to the person.** Every extra ability is not paid once: it is paid on EVERY run of
that automation, including "hello". Many small automations are cheaper AND more reliable than one large
one — the choice among 4 tasks is exact, the choice among 40 is a guess.

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

REUSE BEFORE BUILD (step 258): the product ships with many READY automations. Before proposing to BUILD a
member, SEARCH the catalog (the \`search_automation_catalog\` tool) for one that already does it — a strong
match should be REUSED (the owner clones it), not built again. For each such member the plan says "reuse
<automation> (clone it)" instead of a creation instruction.

The recommendation is persisted as an owner-decision warning on the \`general\` entity, and the owner ACTS
on it by hand (this current automation cannot be developed — its type is fixed, so it cannot become the
group by itself). Therefore the plan must be a HUMAN, NUMBERED, ready-to-execute procedure in the owner's
language — never a dry outline. Write it as literal steps the owner copies and follows:

- **Step 1..N — create each proposed automation.** One numbered step per automation. Each step states, in
  plain words: its TYPE (Stream / Instanced / Chained), the exact NAME to type, and the exact founding
  DESCRIPTION to paste into the creation form — complete enough that pasting it births that automation
  ready to develop. One line naming its mission goes first, then "Type: … / Name: … / Description: …".
- **Step N+1 — group them.** Create the parent \`chained\` group and state which member feeds which,
  through what typed contract (the narrowest seam, §4).
- **Final step — delete THIS automation.** Say it explicitly: this automation is too big to develop and
  will not be built; before deleting it, RECOMMEND the owner copy its current name and type (they may
  reuse them for one of the new automations). Only then delete it. Never leave it orphaned.

Keep every step imperative and self-contained: an owner who reads only the plan, with no other context,
must know exactly what to click, type, and paste at each step.

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
