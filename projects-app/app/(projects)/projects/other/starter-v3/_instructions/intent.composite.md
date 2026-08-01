# CLASS `composite` — one request, two ordered actions

**Where the answer lives:** partly outside, partly in our own stores — and only in that order. **Routes
to:** the middle, carrying an explicit plan.

«When was it last cheaper than it is now?» cannot be answered by one lookup: the current value must be
fetched first, and only then can our own history be read and compared.

## Why it is a class and not a smarter version of another one

Its distinguishing mark is not the topic but the ORDER. If it were left to `fetch-external` or `read-own`,
each would recognize its own half and answer half the question confidently — the worst possible outcome,
because it looks like a complete answer. Naming the class is what makes the two-step nature visible.

## How it recognizes

Deterministically, by the co-occurrence of two signals in one message: a reference to the present state of
the outside world AND a reference to our own past or a comparison. Two signals, not one — a single signal
belongs to a simpler class.

## What it must never do

- **Never execute the plan here.** The class produces `plan` — an explicit, ordered list of steps — and the
  middle carries it out. A front node that fetches is no longer a front node.
- **Never silently drop a step.** If a step cannot be carried out, the answer says which half is missing;
  half an answer presented as whole is the failure this class exists to prevent.
- **Never grow the plan beyond what was asked.**

## Reuse

Domain-neutral: two-step questions appear wherever an automation keeps history and can also look outward.
