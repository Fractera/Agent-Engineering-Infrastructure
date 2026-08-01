# CHANNEL `cron` — a clock, not a message

**Function:** `receiveCron` (derived). **Keys:** none.

The one input that carries no request from anybody. Its envelope is a tick: this moment happened.

## The line that must never be crossed

**A clock exists for scheduled OUTPUT work, never for pulling somebody else's input.** "Every hour, check
their API" is polling with extra steps: it makes this automation responsible for another system's
availability and hides failures inside a schedule nobody watches. If work has to arrive, it is pushed — that
is what the webhook door is for.

## What its function does

Normalises the tick into the shape the automation consumes, carrying the moment. There is no text and no
author: the front will see a request with a time and nothing else, and that is a legitimate kind of run.

## When to reveal it

When something must happen ON TIME rather than in response to somebody — a due reminder, a daily digest, a
periodic report. The schedule itself is configuration, never code.
