# DESTINATION `analytics` — a number on a chart

**Function:** `deliverAnalytics` (derived). **Keys:** none.

Not a record of an event but a measurement of it: what is counted, over what period, in what unit.

## What its function does

Writes the measured value into the automation's analytics store in the shape its tab renders.

## What it must never do

- **Never invent a metric on the fly.** A chart whose meaning changes between runs is worse than no chart:
  the owner reads a trend that never existed.
- **Never duplicate the record.** The event itself belongs in a record store; this door stores the NUMBER.
  Two stores, two facts, neither repeating the other.
- **Never compute the aggregate here.** Deriving the value is the middle's work; this door delivers it.

## When to reveal it

When the owner asks a question of the form "how much / how many / how often" and expects to watch it over
time. If he only ever asks about single events, a chart is decoration.
