# THE MIDDLE GROUP — where the work actually happens

Three kinds live here: `transform` (it changes data), `condition-success` (the path taken when the
answer is yes) and `condition-failure` (the path taken when it is not — and the flow ends there).

## This is the only group that grows

Doors are revealed; the middle is BUILT. Adding and deleting are both allowed here, with one node of
each kind as the floor. Everything you derived in passport §8 lands here: a serious automation carries
thirty to sixty middle nodes, and that is the intended shape, not a warning sign.

- One node = one function = one logical step.
- A middle node carries NO channel: `ioType` is `null`, never a string. Channels belong to doors.
- Every decision the owner spoke in words ("if it is a duplicate", "unless the date is missing") is a
  CONDITION NODE here — not an if-statement hidden inside a transform. A decision inside code cannot be
  seen on the canvas, cannot be rewired by the owner, and cannot be repaired without reading the code.

## How the three kinds divide the work

- `transform` — consumes data, produces DIFFERENT data (parse, normalise, enrich, deduplicate,
  format). It never decides where the flow goes.
- `condition-success` — evaluates one property and CONTINUES the flow: onward to another transform, or
  out to a result. It produces no new data; it routes.
- `condition-failure` — the named end of a path. It carries the reason the run stopped, and nothing
  leaves it. A run that ends here ended honestly; a run that dies silently is a defect.

A condition is not required to be a yes/no question — it is a PROPERTY ("colour is green", "amount is
over 25"). Several conditions may hang off one transform; that is how branching is expressed.

## When you cannot keep it in the middle

If the work piling up here is really two different processes — different inputs, different outputs,
different rhythms of life — do not build them into one automation. Write a warning proposing a group,
and stop. That is a finished job, not a refused one.
