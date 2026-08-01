# DESTINATION `vector-memory` — meaning, so it can be found by words

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
