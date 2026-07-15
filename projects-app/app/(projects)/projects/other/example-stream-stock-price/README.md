# Example: Stock Price Lookup — reference for the STREAM automation type (step 243)

This project is a **reference example**, not a live product automation. It exists to prove, end to end,
that the platform's default **STREAM** capability actually works: a real (non-draft) three-node diagram, a
one-shot ask console (text or voice, no fork), and a live dashboard table with pagination/search/live-refresh
— the same standards `other/example-content-pipeline` already proves for **Instanced**.

## What one ask does

Ask "how much is Apple stock" (or Tesla, Microsoft, …) in the console above the diagram:

```
_nodes/
  parse-request/   meta.ts · functions.ts · instruction.ts   — recognizes a company, resolves its ticker
  lookup-price/    meta.ts · functions.ts · instruction.ts   — real HTTP call to a free quote service
  record-result/   meta.ts · functions.ts · instruction.ts   — writes a History row, ONLY on success
```

A request the small dictionary doesn't recognize (an unrelated question, or a company outside the demo
list) is rejected honestly — shown inline in the console, never written to the History table. **SpaceX** is
in the dictionary on purpose: it is a real, known company with no public ticker, so asking about it proves a
realistic named-company rejection, not just a generic "unrecognized word."

## Why a failed ask never reaches the table

The executor stops a run at the first thrown error. `record-result` is the LAST node — it is only ever
called after `parse-request` and `lookup-price` both succeeded. No special-casing anywhere: this is a direct
consequence of node ORDER, the same mechanism every Stream automation gets for free.

## The launch console

Not part of this project's own code — `_data/activation.ts` declares the one param (`query`, voice-capable);
the projects-zone layout mounts the SAME `ActivationLayer` used by Instanced automations (generalized in step
243), rendering a one-shot "Ask" button instead of a fork/instance list, with the result shown inline.

## The live-price action

The History table's last column (`action:"live"`, step 243's new column-action kind) re-fetches the CURRENT
price for that row's own stored ticker through `app/api/projects/other/example-stream-stock-price/price/
route.ts` — a thin, read-only route reusing `lookup-price`'s own `fetchPrice` function. It never writes a row:
the stored `price` is a snapshot, this button proves it is not stale.

## Co-location invariant

Every function lives **only** inside its `_nodes/<id>/` folder — no shared/common directory. Delete this
project and all of it, including its price route, vanishes with zero technical debt.

<!-- fractera:project
{"kind":"project","category":"other","slug":"example-stream-stock-price","title":"Example: Stock Price Lookup","project":{"title":"Example: Stock Price Lookup","purpose":"Reference automation for the Stream automation type: a real three-node diagram, a one-shot ask console, and a live dashboard table."},"interface":{"inputs":[],"outputs":[]},"nodes":[]}
-->
