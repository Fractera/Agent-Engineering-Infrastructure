# Tool: media-viewer — show a stored object, and open it

**It already exists — never write a second `<img>` preview, a second player or a PDF frame.** Any place that
shows an object of the store wires THIS.

## What it is
Two parts of one primitive:
- **`MediaPreview`** — the table cell. An image becomes a thumbnail; **everything else becomes a container of
  the same size with the type printed inside** (`PDF`, `MP4`, `XML`, `MD`, `TXT`) on one line, truncated if it
  does not fit. Clicking opens the viewer. No `fileKey` → a dash, not a button.
- **`MediaViewer`** — the modal. The window size follows the NATURE of the content, not a single default:
  video in a small centred box that fits a phone (≤420 px), PDF large (≤900 px, 85vh), an image at its size,
  audio compact, text scrollable. An unknown type gets an honest download link instead of a pretend viewer.

## Where it lives — ONE copy, IN this folder
`_components/tools/media-viewer/{client,types}` — a runtime primitive, like `voice-input`'s runtime copy.

**Why not the dev layer:** the STOREFRONT must be able to open an object, and law 0 forbids the public half
from reaching `_shared-v2`. A viewer living only in the cockpit would mean the end user sees a file and
cannot open it.

## API
```tsx
import { MediaPreview, MediaViewer } from "../../tools/media-viewer/client/media-viewer.client";

// in a table cell — this is what you normally need
<MediaPreview fileKey={row.fileKey} name={String(row.name ?? "")} />

// standalone, when you drive the open state yourself
<MediaViewer fileKey={key} name={title} open={open} onOpenChange={setOpen} />
```

| Prop | Meaning |
|---|---|
| `fileKey` | the object's key from a storage row (`obj….mp4`). Empty → the preview renders a dash |
| `name` | shown as the window title and the cell tooltip |
| `open` / `onOpenChange` | only for `MediaViewer`; `MediaPreview` owns its own state |

## The type is DERIVED, never stored
`mediaKindOf(fileKey)` → `image · video · audio · pdf · text · other`, from the key's extension
(`types/media-viewer.ts`). **Do not add a "type" field to a row**: the key already carries it, and two homes
of one fact drift apart. `previewLabelOf(fileKey)` gives the caption for the container.

## Bytes come from the folder's own door
`GET api/files?key=<fileKey>` — open for reading (the key is unguessable and serves as the capability),
`Content-Type` from the extension map in `_lib/store.ts`. **Adding a new format means adding it in two
places:** that map (so the browser plays instead of downloading) and `BY_EXT` in the tool's types.

## Constraints
- Uploading is NOT this tool — that is the cockpit path (`ingestObject`), and it is the only way a file
  reaches the store together with its row.
- Office formats (docx, xlsx) fall into `other`: an honest download link, no rendering.
- A PDF is shown in an `<iframe>` — a browser without a built-in PDF viewer offers the file instead.
