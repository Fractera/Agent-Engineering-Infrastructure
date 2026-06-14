import { AiDraftApp } from "./ai-draft-app.client"
import { requireAdmin } from "@/lib/auth/require-admin"

// Route entry for /ai-draft-settings. Server by default; admin-only service page.
// AI Draft Settings is the intermediate layer where the architect writes free-form
// wishes (supplement / replace) that an agent later applies to the real instruction
// / skill / MCP files of the six agents. Filesystem-backed (no DB).
export default async function AiDraftEntry() {
  await requireAdmin()
  return <AiDraftApp />
}
