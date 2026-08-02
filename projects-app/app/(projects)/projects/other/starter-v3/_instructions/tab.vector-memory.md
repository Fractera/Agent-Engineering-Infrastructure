# TAB `vector-memory` — the RECEIPT of what was remembered

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

Two different things happen at this store, and confusing them is the mistake this file removes:

1. **The search index (LightRAG)** receives the FULL text. **This is the only place the full text exists.**
2. **The row shown here** is a RECEIPT of that: `name` · `summary` · `trackId` · `links`. Never a copy.

**The index is not our data store.** It is written by ingest and read by QUESTION — `readVectorMemory`
returns a synthesised answer, never a row by id. Lose the index and search is gone; the data is not.

## The minimal row

`id` · `table` · `createdAt` · `name` · `summary` (≤300) · `trackId` · `links` — envelope and links are set
by the write itself (`records.md`). A row without a summary is refused by the record schema.

## Columns

Declared in the CORE (`entity.data.columns`), rendered by the shared table — the column law and the three
table rules live in `tab.database.md`, do not restate them. `trackId` is shown: it is how a row is matched
to the document inside the index.

Rows written before step 311.9а.4 carry `content` instead of `summary`; the view falls back to it. That
fallback is a bridge for old data, not a second source.

## Never here

The full text · a run whose request class leaves no record (asking is not saving) · a second implementation
of semantic search — the door is `_lib/memory.ts` and the primitive is `readVectorMemory`
(`_lib/stores/read.ts`).

## Honest degradation

Service unreachable → an honest skip with the reason, the run continues; service refuses with live keys →
throw. Provenance carries a unique tail, so a repeated run never overwrites an earlier fact.
