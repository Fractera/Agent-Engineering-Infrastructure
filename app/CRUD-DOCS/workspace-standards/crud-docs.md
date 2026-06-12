# Documents (CRUD-DOCS) — knowledge base file manager

The **Documents** page (`/documents`) manages your knowledge base as **real files on disk** under
`CRUD-DOCS/` at the project root. Unlike the other filesystem pages (`/glossary`, `/architecture`,
`/patterns`, `/ai-draft-settings`) there is **no staging and no machine block** — a folder you create
or a document you upload is a real entry on disk **immediately**.

## What it is for
Documents that form the base of your knowledge base — company notes, technical processes, anything an
agent should know. When you **activate** a document it is ingested into your vector store, served by
**LightRAG (Company Memory)**, so every agent can recall it semantically.

## Layout
```
CRUD-DOCS/                      # project root, gitignored
  <folder>/                     # any depth
    <sub-folder>/
      handbook.md
    onboarding.txt
  company-overview.docx
```
- The skeleton is just the empty `CRUD-DOCS/` directory, created on first GET (`ensureRoot`).
- **`CRUD-DOCS/` is gitignored** (`app/.gitignore`) — these are user documents, they stay on the
  server and are **never synced to GitHub**. A fresh deploy starts with an empty knowledge base.

## Two-column UI (same shape as /architecture)
- **Left** — the real folder/file tree of any depth. Selecting a folder targets it; selecting a file
  opens its preview.
- **Right** — tools for the selected node:
  - **Folder / root selected:** create a sub-folder (name validated for the filesystem) · upload a
    document · delete the folder (guarded, recursive — not for the root).
  - **File selected:** Preview the whole document · Activate (ingest into Company Memory) · Download ·
    Delete (guarded).

## Allowed documents
`.txt`, `.md` / `.markdown`, `.doc`, `.docx`. Preview renders `.txt`/`.md` as text and extracts
`.docx` to readable text (mammoth). Legacy `.doc` (binary) cannot be previewed as text — Preview
offers Download instead, and it cannot be activated until re-saved as `.docx`/`.txt`/`.md`.

## Filesystem safety
Every path is forced to stay inside `CRUD-DOCS/` (`absFromRel` normalises and rejects `..` escape).
Folder/file names pass `validateName` (no separators, no reserved punctuation/control chars, no
trailing dot/space, ≤100 chars). Deletes are **real and irreversible** — the UI guards them with a
confirmation modal.

## API (`/api/documents`)
| Endpoint | Method | Purpose |
|---|---|---|
| `/tree` | GET | The real folder/file tree (ensures `CRUD-DOCS/`). |
| `/folder` | POST | Create a folder `{ parent, name }` (validated). |
| `/upload` | POST | Upload a document (multipart: `parent` + `file`). |
| `/entry` | DELETE | Delete a folder (recursive) or file `?path=`. |
| `/preview` | GET | Read a document for preview `?path=` (.docx extracted). |
| `/file` | GET | Download the raw bytes `?path=`. |
| `/ingest` | POST | Activate `{ path }` → LightRAG `/documents/text` (best-effort). |

## Activation (ingest)
Activate posts the document text to LightRAG (`{LIGHTRAG_URL}/documents/text`, default
`http://localhost:9621`, `X-API-Key: LIGHTRAG_API_KEY`) — the same contract the hermes
`lightrag-memory` plugin uses. Best-effort: LightRAG needs an embedding/LLM key to actually index; if
it is not configured/reachable the page reports it clearly instead of failing.
