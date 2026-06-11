import { DocumentsApp } from "./documents-app.client"

// Route entry for /documents. Server by default; renders the client island — the
// knowledge-base file manager (real folders/files under CRUD-DOCS/, activated into
// Company Memory via LightRAG). Filesystem is the source of truth (no DB).
export default function DocumentsEntry() {
  return <DocumentsApp />
}
