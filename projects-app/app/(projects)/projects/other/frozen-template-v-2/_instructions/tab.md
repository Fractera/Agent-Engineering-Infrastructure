# A TAB — one surface the owner looks at

A tab is a KIND of surface (a calendar, an analytics, a dashboard, a public page). What it shows are
its ENTITIES: one concrete calendar, one concrete chart. Many entities, one tab.

## Presence — one field, three honest answers

- `absent` — not on the page at all;
- `collapsed` — on the page, folded into an accordion;
- `expanded` — on the page, open.

It is one field on purpose: "present" plus "expanded" as two flags could contradict each other. Choose
by how much room the tab deserves on first sight, not by how proud you are of it.

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
