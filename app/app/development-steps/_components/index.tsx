import { DevelopmentStepsApp } from "./development-steps-app.client"
import { requireAdmin } from "@/lib/auth/require-admin"

// Route entry for /development-steps. Server by default; admin-only service page.
export default async function DevelopmentStepsEntry() {
  await requireAdmin()
  return <DevelopmentStepsApp />
}
