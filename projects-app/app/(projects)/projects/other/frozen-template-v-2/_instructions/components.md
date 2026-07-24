# COMPONENTS — everything the owner SEES, tab by tab

The graph does the work; the components show it. A result the graph produces and no component shows
has not been delivered. Node work and component work go hand in hand — finish a round with both.

## What you build, and what you wait to be asked for

- BUILD WITHOUT BEING ASKED, always: the CONTROL PANEL — the default way the owner sends work into
  this automation — and the DASHBOARD, which carries at least one page. Everything the automation
  records has to be visible somewhere from the first day.
- EVERYTHING ELSE WAITS FOR AN EXPLICIT REQUEST. A calendar, an analytics, a map, a public page exist
  because the owner asked for them, not because the automation could have one.
- A TAB IS A KIND, AN ENTITY IS ONE CONCRETE THING OF THAT KIND: one calendar tab may hold two
  calendars. Need a second calendar? Add an ENTITY to the existing tab — never a second calendar tab.
- `name` must match a folder in `_components/`; that is how the page finds the tab's code.

## What you actually write — the HARD runtime layer

The components you build are the RUNTIME (public) layer — what the END USER sees after development is
over. They belong to the hard side of the resilience law "production hard, development soft": they live
inside this folder and are self-contained, so the folder runs unchanged in any other account and ships as
a ZIP. A component is a PURE REACT COMPONENT and nothing more exotic; it is compiled the moment you save
it and is on the page immediately — on the owner's cockpit and on the public mirror alike. Your flow needs
no build step for a runtime component: if a change is not visible, it did not compile — read the error and
fix it, don't ask anyone to restart anything.

The contract that makes that possible:

- ONE DEFAULT EXPORT, an async server component: `export default async function Calendar() { … }`.
- PLAIN JSX. The runtime is bundled in for you; you do not import React.
- REACH NOTHING OUTSIDE THIS FOLDER. A runtime/public component imports only its own folder (its
  siblings, `_lib/`, `_data/`) plus `zod`. It never imports another automation, a platform module, the v1
  `_shared`, or the soft dev layer `_shared-v2`. A foreign import that works today becomes a dependency
  nobody owns tomorrow, and it breaks self-containment. (`scripts/check-entity-imports.mjs` enforces this:
  the ONE lawful outside path is `_shared-v2`, and ONLY from the dev-slot files — never from a public
  component.)
- DATA COMES FROM THIS AUTOMATION'S OWN DOORS, fetched by their address — never from another
  automation, never from a platform module.
- STYLING is inline or the utility classes already present in the page.

The SOFT layer — the "Build with AI" buttons and the admin settings — is not yours: it lives outside in
`_shared-v2` and is wired in through the fail-silent dev-slot (`_components/shared/dev-slot*`). Production
never depends on it: remove `_shared-v2` and those dev affordances simply stop appearing while every
runtime component keeps working. You do not build or study that layer (AGENTS.md §0).

Everything you cannot express under this contract is a signal, not an obstacle: say so in a warning
rather than reaching outside the folder.

## Where the components appear

- THE OWNER'S COCKPIT — `projects.<domain>/projects/<category>/<slug>` (port 3003 when there is no
  domain): the development surface, after authorisation, architect and manager by default.
- THE PUBLIC MIRROR — `<domain>/projects/<category>/<slug>` (port 3000 without a domain): what a
  visitor sees. What is visible there is decided by role and by the page component's own settings.
(A third placement — inside a parallel route of the public site — belongs to Fractera Pro, which has
no interface yet: see `fracteraPro`. Until it exists, there are two surfaces, not three.)

The same tab therefore has two audiences. Never show on the public mirror what only the owner should
see: keys, raw payloads, internal identifiers, anything a `warning` says.

## Closing component work

Each tab and each entity carries the same record as a node: `info` (the owner's brief, then your
account), `status`, `warnings`, `envKeys`. Close them one by one, exactly like nodes — build it,
replace the brief with your summary, set `materialized`. Blocked means a warning, not a guess.
