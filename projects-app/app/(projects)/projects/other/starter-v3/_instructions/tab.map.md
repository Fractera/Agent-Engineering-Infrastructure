# TAB `map` — the places a run put on the map

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

Shows markers delivered by `deliverMap` — nothing else, and it computes nothing. A place is a FACET of a
record, exactly as an object and an event are; the record holds the links (`records.md`).

## The minimal row

`id` · `table` · `createdAt` · `date` · `title` · `place` · `source` · `lat` · `lng` · `links` — the
envelope and links are set by the write itself. No summary: a marker's content is its coordinates.

## Where the data comes from

`entity.data` declares `table: "map"`, `pageSize` and `columns` — the general law of every tab (`tab.md`).
Until it was declared, the run wrote the marker and linked it to the record while the map showed nothing:
the canvas had no source to read (step 319).

## Never here

- **An invented point.** No `lat`/`lng` → `deliverMap` skips honestly and names the reason. A row without
  coordinates stays in the table and simply does not reach the canvas: "no place" is an answer.
- **A second map.** One working canvas per tab (owner, 2026-07-25). Markers of the store are a LAYER on it,
  with their own icon; they never become stops of the route the human is planning.
- **Own geo code.** No second renderer, router or geocoder: everything geographic goes through the folder
  door `api/geo` — `tools-docs/map.md`. The active region is the owner's choice in Admin; the automation
  consumes whatever region is loaded and degrades honestly when it is not ready.

## Several markers per record

`links` is an array, so one record legitimately owns many places. Producing them is a middle-node job
(`resolveLocation`, step 311.10); until it exists the message contract carries ONE pair of coordinates and
the output writes one row. Do not fake the plural by splitting a single point.

## The table

Columns and the three table rules (minimum column width + horizontal scroll · a page of 10 · a cell of at
most four lines) are the shared law — see `tab.database.md`, do not restate it here.
