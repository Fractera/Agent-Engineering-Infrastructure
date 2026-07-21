# EVERY NODE, WHATEVER ITS KIND

ONE NODE = ONE FUNCTION = ONE LOGICAL STEP. A node that seems to need two functions is two nodes:
complexity is carried by the NUMBER of nodes, never by the thickness of one.

## The function contract — `function: { name, summary, accepts, returns }`

One object, never a list.

- `name` — the identifier the code exports: a verb over data (`extract-date`, `format-reply`). Once
  written it is PUBLIC — other nodes and surfaces call it. You may add a name; you may never rename or
  repurpose one.
- `summary`, `accepts`, `returns` — one line each, 200 characters at most. This is a contract, not
  documentation: `accepts` names what the previous node hands over, `returns` names what the next one
  receives, and the two must match along every edge you draw. If naming what it returns needs the word
  "and", this is two nodes.

## Where the code lives

`_lib/nodes/<function-name>.ts` — ONE file per function, and the file name is the kebab-case of the
function name: `ifSuccess` lives in `if-success.ts`, `transformPayload` in `transform-payload.ts`.
The node says WHAT it does; that folder says HOW. Because the name is the address, no two nodes in
this automation may claim the same function name — the core refuses it.

## How the function must behave

- DETERMINISTIC: same input, same result. No model call at run time unless the owner asked for exactly
  that — a finished automation runs without AI.
- NO SIDE EFFECT except the single one this node exists for. Nothing at import time.
- FAIL LOUDLY: on a real failure throw, so the run stops honestly and the `condition-failure` branch
  handles it. Never return an empty value that pretends to be a result.
- Secrets are read from the environment and declared in `envKeys`; input is never polled (passport §14).

## The fields you fill — and what makes them different

| Field | The question it answers |
|---|---|
| `name` | what the owner reads on the canvas |
| `description` | WHY this node exists, in the owner's terms |
| `function.summary` | WHAT the function does, technically |
| `state` | `visible` = the function runs; `hidden` = it does not, data passes straight through |
| `run` | `sequential` — it needs the result of the node before it; `parallel` — it needs nothing from its siblings and may run beside them |
| `estDurationMs` | your honest estimate while building; replace it with the measured value once a real run has happened |
| `info`, `status` | the owner's brief, then your account of what exists (passport §10–11) |
| `warnings`, `envKeys` | what blocked you, and which keys you used (passport §12, §14.4) |

## Never yours to write

`cuid` (identity), `kind` (a role is for life), `in` and `out` (the ports follow from the kind through
the connection table). Another kind means ANOTHER node: add it, hide this one. What a given kind is
allowed to connect to, and which channel it may carry, is stated by its own instruction — `kind.<kind>`.
