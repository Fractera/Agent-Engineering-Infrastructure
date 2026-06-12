import { AiCoreApp } from "./ai-core-app.client"
import { requireAdmin } from "@/lib/auth/require-admin"

// Route entry component for /ai-core. Server by default; admin-only service page.
export default async function AiCoreEntry() {
  await requireAdmin()
  return <AiCoreApp />
}
