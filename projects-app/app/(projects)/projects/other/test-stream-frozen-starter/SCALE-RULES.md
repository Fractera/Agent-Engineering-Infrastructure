# The scale rules (the decomposition law)

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

REUSE BEFORE BUILD (step 258): the product ships with many READY automations. Before proposing to BUILD a
member, SEARCH the catalog (the `search_automation_catalog` tool) for one that already does it — a strong
match should be REUSED (the owner clones it), not built again. For each such member the plan says "reuse
<automation> (clone it)" instead of a creation instruction.

The recommendation is persisted as an owner-decision warning on the `general` entity, and the owner ACTS
on it by hand (this current automation cannot be developed — its type is fixed, so it cannot become the
group by itself). Therefore the plan must be a HUMAN, NUMBERED, ready-to-execute procedure in the owner's
language — never a dry outline. Write it as literal steps the owner copies and follows:

- **Step 1..N — create each proposed automation.** One numbered step per automation. Each step states, in
  plain words: its TYPE (Stream / Instanced / Chained), the exact NAME to type, and the exact founding
  DESCRIPTION to paste into the creation form — complete enough that pasting it births that automation
  ready to develop. One line naming its mission goes first, then "Type: … / Name: … / Description: …".
- **Step N+1 — group them.** Create the parent `chained` group and state which member feeds which,
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
- The parent `chained` group takes over the public identity; members keep their own pages and diagrams,
  and stay individually TEST-runnable (production activation is group-only).
- Prove parity: after decomposing an existing automation, two virtual end-to-end tests must show the
  group does what the monolith did.
- Recursion is allowed: a member approaching the budget decomposes again. The budget applies PER MEMBER.
