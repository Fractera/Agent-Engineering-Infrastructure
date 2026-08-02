# TAB `storage` — the objects the automation obtained

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

Files: images, video, audio, documents. **Bytes live in the folder's object store; the row holds the
reference** (`fileKey`). The row is not the file and never carries its contents.

## The minimal row

`id` · `table` · `createdAt` · `name` · `fileKey` · `kind` · `size` · `links` — the envelope and links are
set by the write itself (`records.md`). A marker or an event is a FACET of a record; an object is one too,
so it carries no summary — its content is the bytes.

## What the run may leave here

Only objects it actually OBTAINED. **A run that fetched nothing leaves no row** — the store must not
re-serialize the message into a `.txt`: that text already lives in the search index and, condensed, in the
database record. That fallback existed until step 323 and produced a file per run.

A question-class run leaves nothing here at all, and the gate runs BEFORE the bytes are written — writing
the file first and refusing the row afterwards would still litter the store.

## Preview — never a broken image

The type is derived from the KEY (`obj….pdf`), so there is no second field to drift.

- **image** → thumbnail;
- **everything else** → a container of the SAME SIZE with the type printed inside (`PDF`, `MP4`, `XML`,
  `MD`, `TXT`), on ONE line, no wrapping, truncated if it does not fit.

**A long name is shown as its first ~50 characters + «…»**, the whole of it in the tooltip: an object's name
is often the title of a fetched article.

## Viewing — one runtime tool, `_components/tools/media-viewer`

Clicking a preview opens the object. The window size follows the NATURE of the content: video in a small
centred box that fits a phone; PDF in a large one; an image at its size; audio compact; text scrollable.
An unknown type gets an honest download link instead of a pretend viewer.

The tool is a RUNTIME primitive, not a cockpit one — the storefront must be able to open an object, and
law 0 forbids the public half from reaching the dev layer. Reference: `tools-docs/media-viewer.md`.

## Uploading

The owner's own path, cockpit-only: one button per type (image · video · audio · PDF · HTML · XML ·
Markdown · text), the row of buttons scrolls horizontally. Cropping applies to images alone. Everything
goes through the single ingest helper so a file is never on disk without its row.

## The table

Columns and the three table rules (minimum column width + horizontal scroll · a page of 10 · a cell of at
most four lines) are the shared law — see `tab.database.md`, do not restate it here.
