import { PatternsApp } from "./patterns-app.client"
import { requireAdmin } from "@/lib/auth/require-admin"

// Route entry component for /patterns. Server by default; admin-only service page.
export default async function PatternsEntry() {
  await requireAdmin()
  return <PatternsApp />
}
