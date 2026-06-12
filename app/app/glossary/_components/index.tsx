import { GlossaryApp } from "./glossary-app.client"
import { requireAdmin } from "@/lib/auth/require-admin"

// Route entry component for /glossary. Server by default; admin-only service page.
export default async function GlossaryEntry() {
  await requireAdmin()
  return <GlossaryApp />
}
