# LightRAG — REST API Reference

Source: lightrag/api/README.md + Perplexity research
Base URL: http://localhost:9621
Swagger UI: http://localhost:9621/docs
ReDoc: http://localhost:9621/redoc
OpenAPI JSON: http://localhost:9621/openapi.json

---

## Authentication

```
X-API-Key: your-secure-api-key-here
```

Set `LIGHTRAG_API_KEY` in `.env`. Pass as header in every request from Fractera.

---

## Query Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/query` | Synchronous RAG query |
| POST | `/query/stream` | Streaming RAG query (server-sent chunks) |

### POST /query

```json
{
  "query": "Your question here",
  "mode": "hybrid"
}
```

Modes: `naive` · `local` · `global` · `hybrid` · `mix`

Recommended: `mix` when reranker is enabled, `hybrid` otherwise.

---

## Document Management Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/documents/text` | Insert raw text |
| POST | `/documents/file` | Upload single file (multipart) |
| POST | `/documents/batch` | Upload multiple files |
| POST | `/documents/scan` | Scan input directory for new files |
| DELETE | `/documents` | Clear ALL documents and indexes |
| DELETE | `/documents/delete_document` | **Delete ONE document by its doc id** (per-record deletion — used by the Record delete contract, ontology entity 12) |
| DELETE | `/documents/delete_entity` | Delete a single extracted entity |
| DELETE | `/documents/delete_relation` | Delete a single extracted relation |

> Verified against the live server OpenAPI (`:9621/openapi.json`, 2026-07-06): the deployed
> LightRAG exposes per-document deletion (`delete_document`), not only clear-all. An automation's
> Record deletion (188-R) stores the memory doc id at ingest and calls `delete_document` on
> delete; a failed/unknown id still removes the DB row (best-effort, owner never blocked).

### POST /documents/text

```json
{
  "text": "Your document content",
  "description": "Optional description"
}
```

### POST /documents/file

```bash
curl -X POST http://localhost:9621/documents/file \
  -H "X-API-Key: your-key" \
  -F "file=@document.pdf" \
  -F "description=Optional description"
```

### POST /documents/batch

```bash
curl -X POST http://localhost:9621/documents/batch \
  -H "X-API-Key: your-key" \
  -F "files=@doc1.pdf" \
  -F "files=@doc2.txt"
```

---

## Health Check

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Server status and configuration |

---

## Ollama-Compatible Endpoints

LightRAG emulates an Ollama server — allows connecting tools like OpenWebUI.

| Method | Path | Description |
|---|---|---|
| GET | `/api/version` | Emulated Ollama version |
| GET | `/api/tags` | Available models (includes `lightrag:latest`) |
| POST | `/api/chat` | Chat completion via LightRAG |
| POST | `/api/generate` | Direct LLM completion (no RAG) |

### /api/chat mode prefixes

Prefix in message text controls retrieval mode:

| Prefix | Mode |
|---|---|
| `/local` | local |
| `/global` | global |
| `/hybrid` | hybrid |
| `/naive` | naive |
| `/mix` | mix |
| `/bypass` | direct LLM, no RAG |
| _(no prefix)_ | hybrid (default) |

---

## Fractera Integration Plan

### Next.js route handler (proxy)

```typescript
// app/api/lightrag/query/route.ts
export async function POST(req: Request) {
  const body = await req.json()
  const res = await fetch("http://localhost:9621/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.LIGHTRAG_API_KEY ?? "",
    },
    body: JSON.stringify({ query: body.query, mode: body.mode ?? "hybrid" }),
  })
  return Response.json(await res.json())
}
```

### Environment variable to add to .env.example

```env
# LightRAG (v1.3)
LIGHTRAG_API_KEY=your-lightrag-api-key
NEXT_PUBLIC_LIGHTRAG_URL=http://localhost:9621
```

### Port map (no conflicts)

| Service | Port |
|---|---|
| Fractera app | 3000 |
| Bridge server | 3200–3206 |
| Media service | 3300 |
| LightRAG server | 9621 |

---

## Status

- [x] install.md
- [x] env.example.md
- [x] architecture.md
- [x] api-reference.md
- [ ] Fractera integration implementation — pending v1.3
