import { DebugApp } from "./debug-app.client"
import { requireAdmin } from "@/lib/auth/require-admin"

// Route entry component for /debug. Server by default; admin-only service page.
export default async function DebugEntry() {
  await requireAdmin()
  return <DebugApp />
}
