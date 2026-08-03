# A TAB — one surface the owner looks at

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

A tab is a KIND of surface (a calendar, an analytics, a dashboard, a public page). What it shows are
its ENTITIES: one concrete calendar, one concrete chart. Many entities, one tab.

## A TAB MAY CARRY A LAW OF ITS OWN

This general law governs every tab. A tab whose behaviour cannot be derived from it also has
`_instructions/tab.<name>.md` — its own full law — and the core door attaches that text as
`tabInstruction` beside this one, for the tab and for every entity inside it.

The extra law is **derived from the tab's name, never declared**: the object keeps naming `tab`, exactly
as a node keeps naming `nodes` while its `kind.<kind>` instruction rides along. A second field naming
the law would be a second source of truth about which law governs the object, and the two would drift.

Ask the door for the tab (`api/core?select=tab:<name>`) and read `tabInstruction` when it comes: it is
authoritative over any prose about that tab found elsewhere in the folder. No list of which tabs have one
is kept here — such a list rots the moment a law is written.

When you give a tab a law of its own: write `_instructions/tab.<name>.md`, add `"tab.<name>"` to
`SYSTEM_INSTRUCTION_NAMES` in the schema, and change nothing in the core — the door finds it by name.

## 🔒 THE SOURCE AND THE SHAPE ARE DECLARED IN THE CORE — every tab, no exceptions

`entity.data` names WHERE the tab's data lives and WHAT it shows: the store (`table`), the columns or
fields (`key` · `label` ×10 languages · `type` · `source`, plus `minWidth` where the default is wrong), the
page size, and any per-kind settings. **The component only reads that declaration and renders it. Hard-coding
a source or a column list inside a component is a defect, not a shortcut.**

It is paid for four times over, all on 2026-08-02: the database showed a stale table with no map and no
calendar column; the object store and the vector memory rendered lists nobody had declared; the map drew
nothing at all while the runs faithfully wrote and linked their markers — the owner simply had no way to
see them. In every case the LAW was obeyed and the VIEW was a second, private truth.

A tab whose data is a table also obeys the three shared table rules — they live once in
`_components/shared/data-table.client.tsx` and are stated in `tab.database.md`. Link to them; never restate.

## 🔒 A ROW LEADS TO THE ENTITY — every tab, no exceptions

Clicking a row (or a marker, or any object the tab draws) opens the **entity drawer**: the record of the
main database plus every facet linked to it — objects, memory, places, events. A row the owner cannot open
is a dead end: the links were written and mutual all along, and he still could not reach them.

- **One drawer for the whole automation** — `_components/shared/entity-drawer.client.tsx`, opened by the
  shared table itself. A tab neither wires it nor copies it; a second "details" view of its own is the
  defect this replaced (the dashboard carried one and knew nothing of a row's neighbours).
- Its data comes from `api/rows?table=<t>&id=<id>&linked=1`; objects inside it are shown by
  `media-viewer`, never by a second viewer.
- Width, overlay, animation and the close button belong to the PRIMITIVE, not to the tab: do not restyle
  them per tab.
- A journal row (`history`, `analytics`, `toast`) has no entity — the drawer says so in words.
- 🔒 **The row click BELONGS to the entity.** Any other per-row action — editing, settings, a channel —
  gets its OWN visible control in the row. Taking the click for something else is how the dashboard spent
  a whole step with no drawer at all: the cockpit had quietly bound row-click to "edit", and one gesture
  cannot mean two things.

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
