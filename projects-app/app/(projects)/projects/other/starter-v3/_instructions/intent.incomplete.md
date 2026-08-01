# CLASS `incomplete` — the intent is clear, the data is missing

**Where the answer lives:** with the human, who has not said it yet. **Routes to:** an output — one
question back.

«Record» — record what? The automation understood the task and has nothing to perform it on.

## Why asking is a first-class outcome

The alternative to asking is guessing, and a guess that looks confident is the most expensive mistake an
automation can make: the owner does not notice it. A question costs one message and keeps the record true.
This class is the reason «the automation did something odd and nobody knows why» does not have to happen.

## Working with `continuation`

It leaves the question outstanding (`pendingQuestion`) and `continuation` picks up the reply. Together they
are ONE mechanism at the layer, not a private arrangement inside some node — that is what stops the v2
pattern where every node that needed to ask grew its own copy of the same machinery.

## How it recognizes

Deterministically: a bare task verb with no subject, short. Deliberately narrow — being wrong here means
asking a question the human already answered, which is nearly as annoying as guessing.

## What it must never do

- **Never ask more than one question at a time.** A questionnaire in a chat is an interrogation.
- **Never ask what it can derive.** If the missing piece is in the context, it is not missing.
- **Never leave without asking.** Claiming and staying silent strands the human mid-task.

## Reuse

Domain-neutral. What data is missing differs; that it will be missing does not.
