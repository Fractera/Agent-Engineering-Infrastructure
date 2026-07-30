# Tool: image-crop — crop an image to a JPEG blob

A ready-made, reusable UI primitive. **It already exists — never rebuild an image cropper from scratch.**
When a brief asks for image upload / avatars / photo fields / "crop the picture", wire THIS.

## What it is
A modal cropper: the owner picks a crop frame (16:9 / 1:1 / 9:16, or a forced ratio) and a scale on a
`<canvas>`, and it returns the cropped image as a **JPEG `Blob`** (quality 0.92, longest side ≤ 1200px).
Browser-only — there is no server side.

## Where it lives (ONE copy, not in your folder)
`app/(projects)/projects/_shared-v2/tools/image-crop/` — the soft development layer. It is exported from the
`_shared-v2` barrel as `ImageCropper`.

## How to reach it (the law — read before wiring)
A public component of this automation **may not import `_shared-v2`** (`scripts/check-entity-imports.mjs`),
and you must **never copy the cropper into this folder**. The one lawful path is the **dev-slot**
(`_components/shared/dev-slot.tsx` / `dev-slot.client.tsx`), the same fail-silent bridge that mounts every
other `_shared-v2` capability. So an image-ingestion control that uses crop is a **dev-layer / admin-half
tool mounted through the dev-slot**, not a public-half widget.

## API
```ts
import { ImageCropper } from "…/_shared-v2"; // only inside a dev-slot file

<ImageCropper
  open={boolean}          // is the modal open
  src={string}            // source image: data-URL or object-URL
  onDone={(blob: Blob, cropMode: "horizontal" | "square" | "vertical") => void}
  onCancel={() => void}   // closed without a result
  force?={"square" | "horizontal"}  // lock the ratio, hide the ratio picker
  lang={string}           // UI language (ten-language dictionary, rule 4г)
/>
```
`onDone` hands you the JPEG `Blob`. What you do with it is up to the caller.

## Persisting the crop (crop → object storage → database row)
This is how the blob becomes a stored record and how the all-to-all links form:
1. `POST api/files?ext=jpg` with the raw blob bytes as the body → `{ ok, key, size }`. The bytes land in the
   automation's object storage (`_lib/store.ts`, one store per automation). **`key` is the link.**
2. `PUT api/rows { table: "<your table>", values: { fileKey: key, … } }` → a database row that REFERENCES the
   object by its `key`. The same object can be referenced by several rows (relations are all-to-all).
3. Show it back with `GET api/files?key=<key>` (e.g. an `<img src>`). The key is unguessable, so read is open.

## Constraints
- Client-only (canvas). No server module; nothing to import server-side.
- It emits bytes, it does not store them — persistence is the doors above (`api/files` + `api/rows`).
