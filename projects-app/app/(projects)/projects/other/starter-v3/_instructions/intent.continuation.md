# CLASS `continuation` — not a new request, but the second half of the previous one

**Where the answer lives:** in work already begun. **Routes to:** the middle, carrying the answer.

The automation asked something and left the question outstanding (`pendingQuestion`). The next message is
the answer to it — «yes», «the second one», «home». On its own such a message means nothing; it only makes
sense attached to the question it answers.

## Why it stands EARLY in the core

While a question is outstanding, the message belongs to it. If a content class grabbed it first, «yes»
would be recorded as a note and the held work would stay held forever — the exact failure this class
exists to prevent.

## Why it is a CLASS and not a node's private business

In v2 this had no class, so it grew as copies: two different nodes each kept their own `pending` and each
re-implemented the same parsing. A form of address that is missing from the architecture does not
disappear — it reappears wherever it is needed, in as many versions as there are places. One class, one
mechanism, every outstanding question resolved the same way.

## How it recognizes

Deterministically, and NOT by the wording: the signal is the presence of an outstanding question in the
context, not the shape of the reply. Any message, while a question hangs, is its answer.

## What it must never do

- **Never guess the answer's meaning here.** This class attaches the answer to the question; interpreting
  it is the work of whoever asked.
- **Never leave the question hanging after claiming.** It clears `pendingQuestion` — an outstanding
  question that survives its own answer will swallow every following message.
- **Never invent a question that was not asked.**

## Reuse

Domain-neutral. Any automation that ever asks the human anything needs exactly this class.
