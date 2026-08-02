# DESTINATION `vector-memory` — meaning, so it can be found by words

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

**Function:** `deliverVectorMemory` (derived). **Keys:** `LIGHTRAG_URL` (optional, defaults to the local
memory service), `LIGHTRAG_API_KEY` (optional).

The store that answers "what did I say about…" when the words of the question are not the words of the
record. It keeps MEANING; the database keeps facts; object storage keeps bytes.

## What its function does

Sends the text to the memory service and keeps a visible row with the returned tracking id, so the owner can
see what was remembered and the record can point at its own vector document.

## Full text here, summary there

What goes into memory is the FULL original text; what goes into the database may be a short form. That is
deliberate: recall must find a note by a word that never made it into the summary.

## Provenance is mandatory

Every document carries the automation's address plus a unique tail. Without the tail the memory service
treats two facts as one document and the second silently replaces the first — a data loss that looks like
success.

## Honest degradation

No memory service on this server → an honest SKIP with a reason: an automation without memory still delivers
everything else. The service refusing a write is a real failure and throws.

## When to reveal it

When the owner will ask questions in his own words rather than by exact field.

## Two different things happen here (step 311.9а)

1. **The ingest** — the FULL text goes into the search index. This is the only place the full text exists.
2. **The row** — a RECEIPT of that: `name` + `summary` + `trackId` + `links`. Never a copy of the text.

The index is read by QUESTION (`readVectorMemory` → a synthesised answer), never by row id: it searches
meaning, it does not store our data. Lose it and search is gone, the data is not. Full shape: `records.md`.
