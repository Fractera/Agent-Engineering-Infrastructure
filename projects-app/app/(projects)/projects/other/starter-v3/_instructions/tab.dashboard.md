# TAB `dashboard` — every data table of this automation, and the run journal

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

**A data table belongs in the dashboard, not in a tab of its own** (owner's law). Add a table = add an
ENTITY here, never a new tab. Its columns are declared in `entity.data.columns`; the component only renders
them — the full column law is `tab.database.md`, do not restate it.

## What it holds

- **Run journals** — `history` (one row per run), `analytics` (per-channel counters). A journal writes
  ALWAYS: a question is a run too and must stay visible (`records.md`).
- **Any table the automation needs** beyond that. How many and what they hold is the automation's business;
  the minimum a RECORD carries is `tab.database.md`.

## 🔒 Any runtime tool may live inside a cell

The dashboard is universal, so a cell may hold anything the folder's tools render. Which tool for which
job is `tools-docs/` — wire the existing one, never a second implementation.

**An `image` column is an OBJECT column.** It renders through `MediaPreview`: a picture becomes a
thumbnail, any other type becomes a container of the same size with its type printed, and a click opens it.
A bare `<img>` here was the defect — every non-image showed a broken square and could not be opened. An
external `http(s)` address stays a plain picture: it is not an object of our store.

## The row click, and where editing went

A click on a row opens the ENTITY (`tab.md`) — here as everywhere. The cockpit's row EDITING therefore has
its own pencil button in the row; it is never bound to the row click again, and it appears only for live
rows of an owner who may write.

## Never here

Computing the result (a tab shows what an output node delivered) · a hard-coded column list · a second
implementation of a tool that `tools-docs/` already describes.
