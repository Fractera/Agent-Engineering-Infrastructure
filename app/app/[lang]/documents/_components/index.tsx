import { DocumentsApp } from "./documents-app.client"
import { requireAdmin } from "@/lib/auth/require-admin"

// Route entry for /documents. Server by default; admin-only service page — the
// knowledge-base file manager (real folders/files under CRUD-DOCS/, activated into
// Company Memory via LightRAG). Filesystem is the source of truth (no DB).
export default async function DocumentsEntry() {
  await requireAdmin()
  return <DocumentsApp />
}
