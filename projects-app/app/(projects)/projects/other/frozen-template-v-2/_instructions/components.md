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

## What you actually write — plain React, live without a rebuild

A component is a PURE REACT COMPONENT and nothing more exotic. It is compiled the moment you save it
and is on the page immediately — on the owner's cockpit and on the public mirror alike. THERE IS NO
DEPLOYMENT IN YOUR FLOW: never ask for a build, never wait for one, never tell the owner to restart
anything. If your change is not visible, it did not compile — read the error and fix it.

The contract that makes that possible is deliberately strict:

- ONE DEFAULT EXPORT, an async server component: `export default async function Calendar() { … }`.
- PLAIN JSX. The runtime is bundled in for you; you do not import React.
- NO IMPORT STATEMENTS AT ALL. A foreign import that works today becomes a dependency nobody owns
  tomorrow, and it breaks the law that this folder must run unchanged in any other account.
- DATA COMES FROM THIS AUTOMATION'S OWN DOORS, fetched by their address — never from another
  automation, never from a platform module.
- STYLING is inline or the utility classes already present in the page.

Everything you cannot express under that contract is a signal, not an obstacle: say so in a warning
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
