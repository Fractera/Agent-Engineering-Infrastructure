// THE PLATFORM MAP (step 254.9, ROUTE-V3 law 8) — the sixth born per-automation document: the distilled
// platform knowledge an agent needs so it NEVER reads the project root (AUTOMATION-PROJECTS.md stays the
// dev-side original; this is its per-route distillation — one canonical source, emitted as PLATFORM.md).
//
// 🔒 ARCHITECTURE LOCK: this module is the ONLY source of PLATFORM.md. Change the text here — never
// hand-edit an emitted PLATFORM.md (it is regenerated at every birth and would drift).

export function platformDoc(t: { category: string; project: string }): string {
  const a = `${t.category}/${t.project}`;
  return `# PLATFORM.md — the platform, as seen from this automation

This file is the WHOLE platform contract for the automation ${a}. Together with AGENTS.md (who you are,
the boundary), WIRING-RULES.md (nodes & edges) and SCALE-RULES.md (decomposition) it replaces reading any
platform source. What is not in these four documents, you do not need.

## The lifecycle (create → cases → develop → per-object close)

1. An automation is BORN from the frozen starter as a WORKING example (real nodes, a real History table,
   a launch console). Reorienting the demo to the owner's goal is normal first-pass work.
2. USE CASES come first (the Quiz collects them; the owner confirms the reading). No case → no node.
3. Development is DELTA-based: staged briefs (rawRequest) live on entity instances; you implement them.
4. Closing is PER OBJECT — nothing global:
   - a node: write its files, then materialize (compiles instantly, no rebuild; the compiled artifact
     functions.compiled.mjs is runtime truth — NEVER delete or edit it);
   - any other object: implement, then write its ≤300-char summary (owner's language);
   - a BLOCKED object: raise a structured warning and continue with the rest.

## The route is the world (ROUTE-V3)

- Everything of this automation lives in ITS OWN folder: _data/ (declarations), _nodes/<slug>/ (behaviour),
  _types/ (ITS OWN copies of the platform type contracts — import types from "../../_types/...", never
  from platform sources), _lib/ (its own helpers; _lib/rows.ts is the declared bridge for writing table
  rows), _components/ (its page), the six documents.
- Dependency arrows point INWARD. Base layer only: react/next, the UI kit (@/components/ui), the
  entity-section machinery. Everything else is copied in — duplication is the accepted price of autonomy.
- Entities (dashboard, calendar, cron, map, processes, …) follow ONE pattern: view (public core) /
  admin (owner chrome) / container; presence is one enum (expanded | collapsed | hidden).

## Data

- Table rows go through the rows store (one per automation, keyed by table id from _data/dashboard.ts):
  write via the _lib/rows.ts bridge from a node; the History table and the Calendar read the same store.
- Runtime config (bot tokens, keys) is ENV, declared in _data/channels.ts — that renders the Settings
  fields. A secret NEVER appears in code (see AGENTS.md).
- cron.json declares the automation's schedule; the platform runner ticks it; the owner controls it from
  the Cron section.

## The platform API (http://localhost:3003 — the whitelist; using it is not leaving the boundary)

- GET  /api/projects/fetch-complete-automation-architecture-with-history?automation=${a} — the bundle;
  its agent_instruction is the contract; work the entities flagged pending:true.
- POST /api/projects/nodes/<cuid>/materialize {"summary":"≤300 chars"} — compile + go live instantly.
- POST /api/projects/entity-summary {"automation":"${a}","entityType":"<t>","ref":"<ref>","summary":"…"}.
- POST /api/projects/entity-warning — kinds: hermes-scout (needs hermesInstruction) / owner-decision /
  external-service / missing-credentials (needs keys[], declared in _data/channels.ts).
- GET  /api/projects/validate?automation=${a} — must return ok:true when you are done.
- POST /api/projects/run {"automation":"${a}","input":{...}} — activate. This automation also carries its
  OWN doors, served inside its folder (step 254.11): POST /projects/${a}/api/run {"input":{...}} and
  GET /projects/${a}/api/rows?table=… — both surfaces (cockpit and public page) call these.

## Budgets and honesty

- The node budget and the decomposition law: SCALE-RULES.md (your FIRST decision).
- "Compiles" is not "works": trace the data path (WIRING-RULES.md) before mounting anything.
- Report, summaries, warnings — always in the OWNER'S language.
`;
}
