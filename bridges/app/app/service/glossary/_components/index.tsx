import { GlossaryApp } from "./glossary-app.client"

// Route entry component for /service/glossary. Admin-only — access enforced by the
// admin proxy.ts (no requireAdmin() guard here, unlike the slot version).
export default function GlossaryEntry() {
  return <GlossaryApp />
}
