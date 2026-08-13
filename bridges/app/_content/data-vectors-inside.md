# Vector memory: what is already built

Ordinary search looks for words. Vector search looks for **meaning**: a visitor
asks "how do I get grease off a stove" and finds a product whose description never
uses the word "grease". This is what recommendations, related items and answers
drawn from your own material are built on.

You already have it, and you do not pay for it separately.

## What you never have to do

**No vector database to run.** No separate server, no cloud service billed by the
hour, no additional account.

**No index to design.** It exists, and it is real: search runs through an index, not
by scanning every row. The difference is invisible at a hundred rows and decisive at
tens of thousands.

**No two stores to keep in sync.** Vectors live **in the same file** as the rows
they describe. One backup, one access posture, one delete. A separate vector
database would be a second half of the truth, and one day it would disagree with the
first.

## What is configured

The embedding model is `text-embedding-3-small`, 1536 dimensions, with an index
partitioned by collection: a search inside a collection touches only that
collection, not the whole store.

The one thing needed from you is an **OpenAI key** in the panel: the embeddings are
computed there. Without a key the store still works, but new rows do not enter it —
and the panel says so plainly instead of staying silent.

## How this keeps costs down

**Search returns only the nearest.** The index picks the required number of rows and
the exact score is computed for those — the cost of a query does not grow with the
size of the store.

**An embedding is computed once** on write, not on every search: you pay for a text
once and search it as often as you like.

**Honest about its own degree.** If the index extension turns out to be old or
missing on a server, the store keeps working by scanning and **says so** in its
status. A slow honest answer beats a fast story about an index that is not there.

## The honest boundary

Vector search does not replace the ordinary kind: an exact part number is better
found as text. The right answer is both, and you have both.
