# TAB `database` — the automation's own records, and the CENTRE OF LINKS

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

Shows what the automation OWNS. Not a text store (that is the search index) and not a run journal (that is
the dashboard). Data comes from `deliverDatabase` only — the tab computes nothing.

## The minimal record — every automation, no exceptions

| Field | Type | Who sets it | Enforced by |
|---|---|---|---|
| `id` · `table` · `createdAt` | strings | the write | row envelope |
| `name` | non-empty string | the middle names the subject; a derived title is the fallback | record schema |
| `summary` | string ≤ **300** | middle condensed → verbatim copy → truncation with a mark | record schema |
| `summarySource` | `given` · `verbatim` · `truncated` | the write | — (visible, never hidden) |
| `links` | **array** of `{table,id}` | the write itself (`addEntityRow`) | envelope, default `[]` |

**The full text is never here** — it lives in the search index alone. Anything beyond this minimum belongs
to the automation: how many tables it keeps and what else they hold is not decided by this file. Full
shape of a record: `records.md`.

## The minimal columns, and their format

| Column | Source | Cell type |
|---|---|---|
| ID | `id` | `chip` |
| Name | `name` | `text` |
| Summary | `summary` | `text` |
| Storage · Vectors · Map · Calendar | `links:<store>` | **`ids` — an ARRAY, never one string** |
| Added | `createdAt` | `date` |

**Columns are DECLARED IN THE CORE** (`entity.data.columns`: key · label ×10 languages · type · source),
and the component only renders them. While the list lived in the component, the record law was obeyed and
the owner still saw a stale table without map and calendar. Never hard-code a column list again.

**Every link column is an ARRAY.** One record legitimately owns several objects, several markers, several
events. A per-neighbour single value is how the calendar link went missing for weeks. An empty array
renders as a dash: "no links" is an answer, not a blank.

## The table interface is SHARED, and these three rules are not yours to bend

They live once in `_components/shared/data-table.client.tsx` and hold for every table of every tab:

1. **Minimum column width + horizontal scroll.** A column never squeezes below its minimum; when space
   runs out the TABLE scrolls. Consequence, and it is a law: **there is no limit on the number of columns.**
2. **A page is 10 rows**, paginated with the shadcn primitive (`@/components/ui/pagination`).
3. **A cell is at most four lines**, then it is cut with an ellipsis; the whole value stays in the tooltip.

Need a cell the shared set does not have (an image preview, a formatted size)? Pass `renderCell` — never
fork the table.

## Never here

The full text · links kept as per-neighbour fields · writes from the middle · a hard-coded column list.
