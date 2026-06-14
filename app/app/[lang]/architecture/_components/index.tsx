import { ArchitectureApp } from "./architecture-app.client"
import { requireAdmin } from "@/lib/auth/require-admin"

// Route entry component for /architecture. Server by default; admin-only service page.
export default async function ArchitectureEntry() {
  await requireAdmin()
  return <ArchitectureApp />
}
