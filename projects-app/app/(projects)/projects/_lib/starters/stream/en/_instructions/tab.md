# A TAB — one surface the owner looks at

A tab is a KIND of surface (a calendar, an analytics, a dashboard, a public page). What it shows are
its ENTITIES: one concrete calendar, one concrete chart. Many entities, one tab.

## A TAB MAY CARRY A LAW OF ITS OWN

This general law governs every tab. A tab whose behaviour cannot be derived from it also has
`_instructions/tab.<name>.md` — its own full law — and the core door attaches that text as
`tabInstruction` beside this one, for the tab and for every entity inside it.

The extra law is **derived from the tab's name, never declared**: the object keeps naming `tab`, exactly
as a node keeps naming `nodes` while its `kind.<kind>` instruction rides along. A second field naming
the law would be a second source of truth about which law governs the object, and the two would drift.

Today one tab has such a law: **`calendar`** (`tab.calendar` — the due-notice beat, the browser watcher,
why delivery may not live in the browser, integrations and their keys). Read it before touching anything
in that tab; it is authoritative over any prose about the calendar found elsewhere in the folder.

When you give a tab a law of its own: write `_instructions/tab.<name>.md`, add `"tab.<name>"` to
`SYSTEM_INSTRUCTION_NAMES` in the schema, and change nothing in the core — the door finds it by name.

## Presence — one field, three honest answers

- `absent` — not on the page at all;
- `collapsed` — on the page, folded into an accordion;
- `expanded` — on the page, open.

It is one field on purpose: "present" plus "expanded" as two flags could contradict each other. Choose
by how much room the tab deserves on first sight, not by how proud you are of it.

AT LAUNCH, `dashboard` IS `expanded` BY DEFAULT. When the automation becomes a real project the
`dashboard` output door is opened unless the owner asked for another destination (see `group.output`),
and the tab that shows what that door writes must be open with it — not folded away. This is the one
tab whose starting presence is decided for you; every other tab you choose by the rule above.

## Working inside a tab

- `name` matches the folder in `_components/` — that is how its code is found. Renaming a tab without
  renaming its folder breaks the page.
- ADD AN ENTITY rather than a second tab of the same kind. Two calendars are two entities in the
  calendar tab.
- `data` holds an entity's own settings — the enumeration of what will be created for it (as a table
  would name its columns and their types). Put the settings there, not into prose in `info`.
- The tab and each of its entities carry `info`, `status`, `warnings`, `envKeys`, exactly like a node,
  and are closed the same way: build it, replace the owner's brief with your account, set
  `materialized`; blocked means a warning.
- WHAT A TAB SHOWS COMES FROM THE GRAPH. A tab does not compute the automation's result — an output
  node delivers it, and the tab displays what was delivered. If a tab needs data nobody produces, the
  missing piece is a node, not a query hidden inside the component.
- TWO AUDIENCES, ONE TAB: the owner's cockpit and the public mirror. Never render keys, raw payloads,
  internal identifiers or warnings on the public side.
