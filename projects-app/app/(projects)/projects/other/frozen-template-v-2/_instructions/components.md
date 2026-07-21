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
