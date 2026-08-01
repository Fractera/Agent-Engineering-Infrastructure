# CLASS `read-own` — a question about what this automation already keeps

**Where the answer lives:** in our own stores. **Routes to:** the middle, which searches them.

«What did I save about X», «did I ever write that down», «when was that». The answer exists inside the
automation — in the database, the vector memory, the object storage, the map, the calendar.

## The rule that must never bend

**A question about data is not data.** This class NEVER produces a record. In v2 this boundary lived inside
a domain classifier and leaked constantly: the owner asked a question and got «saved ✅» — the question
itself stored as a note. Making it a class puts the boundary in the architecture instead of in someone's
good intentions.

## How it recognizes

Deterministically, from forms that ask about the past or about our own contents («what did I», «have I
saved», «what do you know about», «when was»). Where a model is used, its answer is checked: an
unrecognized token means «not this class», never «probably this class».

## What it must never do

- **Never read here.** The class recognizes the question and hands it on; searching the stores is the
  middle's work — that is where the store contract lives.
- **Never answer from nothing.** Found nothing is an honest answer with a name («nothing saved about X»),
  not silence and not an invented recollection.
- **Never mix in a write.** Not even «I will remember you asked».

## Reuse

Domain-neutral. What the stores contain differs everywhere; that the owner will ask about it does not.
